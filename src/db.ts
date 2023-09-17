import { Database } from "bun:sqlite";

export type Instrunction = {
  id: number;
  name: string;
  steps: number;
  controls: number[][];
};

export const db = new Database("db.sqlite", { create: true });

export function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instructions (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      steps INTEGER NOT NULL,
      controls TEXT NOT NULL
    );
  `);
}

export function instructions(): Instrunction[] {
  return db
    .prepare("SELECT * FROM instructions")
    .all()
    .map((row) => {
      let r = row as {
        id: number;
        name: string;
        steps: number;
        controls: string;
      };
      return {
        ...r,
        controls: text_to_controls(r.controls),
      };
    });
}

export function instruction(id: number): Instrunction {
  let row = db.prepare("SELECT * FROM instructions WHERE id = ?").get(id);
  let r = row as {
    id: number;
    name: string;
    steps: number;
    controls: string;
  };
  return {
    ...r,
    controls: text_to_controls(r.controls),
  };
}

export function update_instruction({
  name,
  steps,
  controls,
  id,
}: Instrunction) {
  db.prepare(
    "UPDATE instructions SET name = ?1, steps = ?2, controls = ?3 WHERE id = ?4",
  ).run(name, steps, controls_to_text(controls), id);
}

export function create_instruction(name: string): Instrunction {
  let result = db
    .prepare(
      'INSERT INTO instructions (name, steps, controls) VALUES (?1, 0, "") RETURNING id',
    )
    .get(name) as { id: number };
  return {
    id: result.id,
    name: name,
    steps: 0,
    controls: [],
  };
}

export function delete_instruction(id: number) {
  db.prepare("DELETE FROM instructions WHERE id = ?").run(id);
}

function text_to_controls(text: string): number[][] {
  return text.split("\n").map((line) => {
    return line.split(" ").map((num) => parseInt(num));
  });
}

function controls_to_text(controls: number[][]): string {
  return controls.map((line) => line.join(" ")).join("\n");
}
