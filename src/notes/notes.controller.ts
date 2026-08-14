import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get()
  async findAll() {
    return this.notesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body('text') text: string) {
    return this.notesService.update(id, text);
  }

  @Post()
  async create(
    @Body('text') text: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.notesService.create(text, metadata);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.notesService.remove(id);
  }
}
