/**
 * @file Unit tests for the NotesService.
 *
 * These tests verify the business logic in NotesService by mocking
 * the TypeORM {@link Repository} so that no real database is involved.
 * Each CRUD method is tested for happy paths, edge cases, not-found
 * scenarios, and unexpected repository errors.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotesService } from '../../src/notes/notes.service';
import { Note } from '../../src/notes/notes.entity';

/**
 * Creates a mock implementation of the TypeORM {@link Repository} for {@link Note}.
 *
 * Only the methods actually used by NotesService are stubbed.
 * A fresh mock is created before each test to avoid shared state.
 *
 * @returns {object} A plain object whose shape mirrors the Repository methods used by the service.
 */
const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

/** Convenience type inferred from the mock factory. */
type MockRepository = ReturnType<typeof createMockRepository>;

/**
 * Builds a {@link Note} entity with sensible defaults.
 * Any field can be overridden via the `overrides` parameter.
 *
 * @param {Partial<Note>} overrides - Optional partial Note fields to override defaults.
 * @returns {Note} A fully populated Note fixture.
 */
const buildNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'uuid-1',
  text: 'Test note',
  metadata: null as any,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('NotesService', () => {
  let service: NotesService;
  let repo: MockRepository;

  /**
   * Before each test: create a fresh NestJS testing module with the
   * real service but a mocked Repository provider (registered via
   * the TypeORM repository token for the Note entity).
   */
  beforeEach(async () => {
    repo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  /** Reset all mock call history between tests to prevent bleed. */
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // findAll
  // =========================================================================

  /** @description Tests for {@link NotesService.findAll} — retrieves all notes. */
  describe('findAll', () => {
    /**
     * Happy path: repository returns a populated array.
     * Verifies the service calls `repo.find()` and returns the result as-is.
     */
    it('should return an array of notes', async () => {
      const notes = [buildNote(), buildNote({ id: 'uuid-2', text: 'Second' })];
      repo.find.mockResolvedValue(notes);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(repo.find).toHaveBeenCalledWith();
      expect(result).toEqual(notes);
    });

    /**
     * Edge case: no notes in the database.
     * The service should return an empty array, not null or undefined.
     */
    it('should return an empty array when no notes exist', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    /**
     * Error propagation: if the repository throws (e.g. connection lost),
     * the service should let it bubble up without catching.
     */
    it('should propagate unexpected repository errors', async () => {
      const dbError = new Error('Connection lost');
      repo.find.mockRejectedValue(dbError);

      await expect(service.findAll()).rejects.toThrow('Connection lost');
      expect(repo.find).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  /** @description Tests for {@link NotesService.create} — persists a new note. */
  describe('create', () => {
    /**
     * Happy path: creates a note with text only (no metadata).
     * Verifies `repo.create()` is called with `{ text, metadata: undefined }`
     * and `repo.save()` receives the entity returned by `create()`.
     */
    it('should create and return a note with text only', async () => {
      const noteEntity = buildNote({ text: 'Hello' });
      repo.create.mockReturnValue(noteEntity);
      repo.save.mockResolvedValue(noteEntity);

      const result = await service.create('Hello');

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith({ text: 'Hello', metadata: undefined });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledWith(noteEntity);
      expect(result).toEqual(noteEntity);
    });

    /**
     * Happy path with optional metadata: verifies the metadata JSONB
     * payload is forwarded through both `create()` and `save()`.
     */
    it('should create and return a note with text and metadata', async () => {
      const metadata = { priority: 'high', tags: ['urgent'] };
      const noteEntity = buildNote({ text: 'With meta', metadata });
      repo.create.mockReturnValue(noteEntity);
      repo.save.mockResolvedValue(noteEntity);

      const result = await service.create('With meta', metadata);

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith({ text: 'With meta', metadata });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(noteEntity);
    });

    /**
     * Edge case: empty string as text.
     * The service should accept it — validation is the caller's responsibility.
     */
    it('should create a note with empty text', async () => {
      const noteEntity = buildNote({ text: '' });
      repo.create.mockReturnValue(noteEntity);
      repo.save.mockResolvedValue(noteEntity);

      const result = await service.create('');

      expect(repo.create).toHaveBeenCalledWith({ text: '', metadata: undefined });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(noteEntity);
    });

    /**
     * Error propagation: if `repo.save()` throws (e.g. unique constraint),
     * the service should let it bubble up.
     */
    it('should propagate repository save errors', async () => {
      repo.create.mockReturnValue({});
      repo.save.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(service.create('dup')).rejects.toThrow('Unique constraint violation');
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  /** @description Tests for {@link NotesService.findOne} — retrieves a single note by id. */
  describe('findOne', () => {
    /**
     * Happy path: note exists in the repository.
     * Verifies the `where` clause includes the correct id.
     */
    it('should return a note when it exists', async () => {
      const note = buildNote();
      repo.findOne.mockResolvedValue(note);

      const result = await service.findOne('uuid-1');

      expect(repo.findOne).toHaveBeenCalledTimes(1);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toEqual(note);
    });

    /**
     * Not-found case: repository returns null for an unknown id.
     * The service returns null without throwing (the caller decides behavior).
     */
    it('should return null when the note does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(repo.findOne).toHaveBeenCalledTimes(1);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });

    /**
     * Error propagation: unexpected repository errors (e.g. timeout)
     * should not be caught by the service.
     */
    it('should propagate unexpected repository errors', async () => {
      repo.findOne.mockRejectedValue(new Error('Timeout'));

      await expect(service.findOne('uuid-1')).rejects.toThrow('Timeout');
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  /** @description Tests for {@link NotesService.update} — updates a note's text. */
  describe('update', () => {
    /**
     * Happy path: the note exists and is updated in-place.
     * The service mutates `note.text` before calling `repo.save()`,
     * so we assert `save` receives the mutated entity.
     */
    it('should update and return the note when it exists', async () => {
      const existingNote = buildNote({ text: 'Old text' });
      const updatedNote = { ...existingNote, text: 'New text' };

      repo.findOne.mockResolvedValue({ ...existingNote });
      repo.save.mockResolvedValue(updatedNote);

      const result = await service.update('uuid-1', 'New text');

      expect(repo.findOne).toHaveBeenCalledTimes(1);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(repo.save).toHaveBeenCalledTimes(1);
      // The service mutates note.text before saving, so save receives the mutated note
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'uuid-1', text: 'New text' }),
      );
      expect(result).toEqual(updatedNote);
    });

    /**
     * Not-found case: repository returns null, so the service throws
     * {@link NotFoundException} with a descriptive message.
     * Also verifies `repo.save()` is never called.
     */
    it('should throw NotFoundException when the note does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update('ghost-id', 'text')).rejects.toThrow(NotFoundException);
      await expect(service.update('ghost-id', 'text')).rejects.toThrow(
        'Note with id ghost-id not found',
      );
      // Called twice because we awaited the promise twice
      expect(repo.findOne).toHaveBeenCalledTimes(2);
      expect(repo.save).not.toHaveBeenCalled();
    });

    /**
     * Edge case: updating a note's text to an empty string.
     * The service should not reject this.
     */
    it('should allow updating with empty text', async () => {
      const existingNote = buildNote({ text: 'Has text' });
      const updatedNote = { ...existingNote, text: '' };

      repo.findOne.mockResolvedValue({ ...existingNote });
      repo.save.mockResolvedValue(updatedNote);

      const result = await service.update('uuid-1', '');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ text: '' }),
      );
      expect(result).toEqual(updatedNote);
    });

    /**
     * Error propagation: if `repo.save()` throws after a successful find,
     * the error should bubble up through the service.
     */
    it('should propagate repository save errors', async () => {
      repo.findOne.mockResolvedValue(buildNote());
      repo.save.mockRejectedValue(new Error('Disk full'));

      await expect(service.update('uuid-1', 'text')).rejects.toThrow('Disk full');
      expect(repo.findOne).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // remove
  // =========================================================================

  /** @description Tests for {@link NotesService.remove} — deletes a note by id. */
  describe('remove', () => {
    /**
     * Happy path: note is deleted successfully.
     * The service returns void, so the result should be undefined.
     */
    it('should call delete with the correct id', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await service.remove('uuid-1');

      expect(repo.delete).toHaveBeenCalledTimes(1);
      expect(repo.delete).toHaveBeenCalledWith('uuid-1');
      expect(result).toBeUndefined();
    });

    /**
     * Idempotent delete: TypeORM's `delete()` does not throw when
     * no rows are affected. The current service does not check
     * `affected`, so deleting a non-existent note silently succeeds.
     */
    it('should not throw when deleting a non-existent note (TypeORM delete is idempotent)', async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: {} });

      // The current service implementation does not check `affected`, so no error is thrown
      await expect(service.remove('nonexistent')).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledTimes(1);
      expect(repo.delete).toHaveBeenCalledWith('nonexistent');
    });

    /**
     * Error propagation: unexpected repository errors (e.g. FK constraint)
     * should bubble up through the service.
     */
    it('should propagate unexpected repository errors', async () => {
      repo.delete.mockRejectedValue(new Error('FK constraint'));

      await expect(service.remove('uuid-1')).rejects.toThrow('FK constraint');
      expect(repo.delete).toHaveBeenCalledTimes(1);
    });
  });
});
