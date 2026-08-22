/**
 * @file Unit tests for the NotesController.
 *
 * These tests verify that the controller correctly delegates to
 * the NotesService and faithfully returns (or propagates) whatever
 * the service produces — including errors.
 *
 * The real NotesService is replaced with a Jest mock so that
 * controller tests never touch the repository or database layer.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotesController } from '../../src/notes/notes.controller';
import { NotesService } from '../../src/notes/notes.service';
import { Note } from '../../src/notes/notes.entity';

/**
 * Creates a mock implementation of {@link NotesService}.
 *
 * Every public method is stubbed with `jest.fn()` so we can
 * configure return values and assert call arguments per test.
 *
 * @returns {object} A plain object whose shape mirrors NotesService.
 */
const createMockNotesService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

/** Convenience type inferred from the mock factory. */
type MockNotesService = ReturnType<typeof createMockNotesService>;

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

describe('NotesController', () => {
  let controller: NotesController;
  let service: MockNotesService;

  /**
   * Before each test: create a fresh NestJS testing module with
   * the real controller but a mocked NotesService provider.
   */
  beforeEach(async () => {
    service = createMockNotesService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        {
          provide: NotesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
  });

  /** Reset all mock call history between tests to prevent bleed. */
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // findAll
  // =========================================================================

  /** @description Tests for GET /notes — retrieves all notes. */
  describe('findAll', () => {
    /**
     * Happy path: service returns a populated array.
     * Verifies the controller passes it through unchanged.
     */
    it('should return an array of notes', async () => {
      const notes = [buildNote(), buildNote({ id: 'uuid-2', text: 'Second' })];
      service.findAll.mockResolvedValue(notes);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(notes);
    });

    /**
     * Edge case: no notes in the database.
     * The controller should still return an empty array, not null/undefined.
     */
    it('should return an empty array when no notes exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    /**
     * Error propagation: if the service throws, the controller
     * should not swallow the error — it must bubble up.
     */
    it('should propagate service errors to the caller', async () => {
      service.findAll.mockRejectedValue(new Error('Service failure'));

      await expect(controller.findAll()).rejects.toThrow('Service failure');
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  /** @description Tests for GET /notes/:id — retrieves a single note. */
  describe('findOne', () => {
    /**
     * Happy path: note exists and is returned.
     * Verifies the id parameter is forwarded correctly.
     */
    it('should return a single note by id', async () => {
      const note = buildNote();
      service.findOne.mockResolvedValue(note);

      const result = await controller.findOne('uuid-1');

      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(note);
    });

    /**
     * Not-found case: the service returns null for an unknown id.
     * The controller passes null through (the service decides the behavior).
     */
    it('should return null when the note does not exist', async () => {
      service.findOne.mockResolvedValue(null);

      const result = await controller.findOne('nonexistent');

      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(service.findOne).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });

    /**
     * Verifies that a {@link NotFoundException} thrown by the service
     * propagates through the controller with the correct message.
     */
    it('should propagate NotFoundException from the service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Note with id ghost not found'),
      );

      await expect(controller.findOne('ghost')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('ghost')).rejects.toThrow(
        'Note with id ghost not found',
      );
      expect(service.findOne).toHaveBeenCalledTimes(2);
    });

    /**
     * Generic error propagation: unexpected errors (e.g. DB timeouts)
     * should not be caught or transformed by the controller.
     */
    it('should propagate unexpected service errors', async () => {
      service.findOne.mockRejectedValue(new Error('Unexpected'));

      await expect(controller.findOne('uuid-1')).rejects.toThrow('Unexpected');
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  /** @description Tests for POST /notes — creates a new note. */
  describe('create', () => {
    /**
     * Happy path: creates a note with text only (no metadata).
     * Metadata should be forwarded as `undefined`.
     */
    it('should create a note with text only and return it', async () => {
      const note = buildNote({ text: 'Hello' });
      service.create.mockResolvedValue(note);

      const result = await controller.create('Hello');

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith('Hello', undefined);
      expect(result).toEqual(note);
    });

    /**
     * Happy path with optional metadata: verifies the controller
     * forwards the metadata object to the service unchanged.
     */
    it('should create a note with text and metadata', async () => {
      const metadata = { priority: 'high' };
      const note = buildNote({ text: 'With meta', metadata });
      service.create.mockResolvedValue(note);

      const result = await controller.create('With meta', metadata);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith('With meta', metadata);
      expect(result).toEqual(note);
    });

    /**
     * Edge case: empty string as text.
     * The controller should not reject this — validation is the service's job.
     */
    it('should handle creation with empty text', async () => {
      const note = buildNote({ text: '' });
      service.create.mockResolvedValue(note);

      const result = await controller.create('');

      expect(service.create).toHaveBeenCalledWith('', undefined);
      expect(result).toEqual(note);
    });

    /**
     * Error propagation: a service-level validation failure
     * (or any thrown error) should bubble up through the controller.
     */
    it('should propagate service errors during creation', async () => {
      service.create.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create('bad')).rejects.toThrow('Validation failed');
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  /** @description Tests for PATCH /notes/:id — updates a note's text. */
  describe('update', () => {
    /**
     * Happy path: note exists and is updated successfully.
     * Verifies both `id` and `text` are forwarded to the service.
     */
    it('should update and return the note', async () => {
      const updatedNote = buildNote({ text: 'Updated' });
      service.update.mockResolvedValue(updatedNote);

      const result = await controller.update('uuid-1', 'Updated');

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith('uuid-1', 'Updated');
      expect(result).toEqual(updatedNote);
    });

    /**
     * Not-found case: service throws {@link NotFoundException}.
     * Asserts both the exception type and the human-readable message.
     */
    it('should throw NotFoundException when the service cannot find the note', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Note with id ghost-id not found'),
      );

      await expect(controller.update('ghost-id', 'text')).rejects.toThrow(NotFoundException);
      await expect(controller.update('ghost-id', 'text')).rejects.toThrow(
        'Note with id ghost-id not found',
      );
      expect(service.update).toHaveBeenCalledTimes(2);
    });

    /**
     * Edge case: updating a note's text to an empty string.
     * The controller should forward it without interference.
     */
    it('should handle update with empty text', async () => {
      const updatedNote = buildNote({ text: '' });
      service.update.mockResolvedValue(updatedNote);

      const result = await controller.update('uuid-1', '');

      expect(service.update).toHaveBeenCalledWith('uuid-1', '');
      expect(result).toEqual(updatedNote);
    });

    /**
     * Error propagation: unexpected service-layer errors
     * (e.g. database lock) should surface to the caller.
     */
    it('should propagate unexpected service errors', async () => {
      service.update.mockRejectedValue(new Error('DB locked'));

      await expect(controller.update('uuid-1', 'text')).rejects.toThrow('DB locked');
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // remove
  // =========================================================================

  /** @description Tests for DELETE /notes/:id — deletes a note. */
  describe('remove', () => {
    /**
     * Happy path: note is deleted successfully.
     * The service returns void, so the controller result should be undefined.
     */
    it('should call service.remove with the correct id', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('uuid-1');

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith('uuid-1');
      expect(result).toBeUndefined();
    });

    /**
     * Not-found case: service throws {@link NotFoundException}.
     * The controller should not catch or transform this.
     */
    it('should propagate NotFoundException from the service', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException('Note with id ghost not found'),
      );

      await expect(controller.remove('ghost')).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    /**
     * Error propagation: unexpected errors (e.g. cascade failure)
     * should bubble up through the controller unchanged.
     */
    it('should propagate unexpected service errors', async () => {
      service.remove.mockRejectedValue(new Error('Cascade failure'));

      await expect(controller.remove('uuid-1')).rejects.toThrow('Cascade failure');
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });
});
