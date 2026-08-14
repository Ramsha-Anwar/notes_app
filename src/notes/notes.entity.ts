import { Column, Entity, PrimaryGeneratedColumn , CreateDateColumn } from "typeorm";

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}