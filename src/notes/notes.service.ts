import {Injectable, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {Note} from "./notes.entity";

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
  ) {}

  async findAll (): Promise<Note[]> {
    return this.noteRepository.find();
  }

  async create (text: string): Promise<Note> {
    const note = this.noteRepository.create({ text });
    return this.noteRepository.save(note);
  }

  async findOne(id: string): Promise<Note | null> {
    return this.noteRepository.findOne({ where: { id } });
  }

  async update(id: string, text: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with id ${id} not found`);
    }
    note.text = text;
    return this.noteRepository.save(note);
  }

  async remove(id: string): Promise<void> {
    await this.noteRepository.delete(id);
  }
}