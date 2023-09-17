import html from "@elysiajs/html";
import Elysia, { t } from "elysia";
import * as elements from "typed-html";
import * as db from "./db";
import { Instrunction } from "./db";

db.init();
const app = new Elysia()
  .use(html)
  .get("/", ({ html }) =>
    html(
      <BaseHtml>
        <body
          class="bg-zinc-800 text-white"
          hx-get="/instructions"
          hx-trigger="load"
          hx-swap="innerHTML"
        />
      </BaseHtml>,
    ),
  )
  .get("/instructions", () => (
    <InstructionList instructions={db.instructions()} />
  ))
  .post(
    "/add_instruction",
    ({ body }) => {
      let instruction = db.create_instruction(body.name);
      return <Instruction {...instruction} />;
    },
    { body: t.Object({ name: t.String() }) },
  )
  .post(
    "/add_row/:id",
    ({ params }) => {
      let instruction = db.instruction(params.id);
      instruction.steps++;
      instruction.controls.push(Array(Controls.length).fill(0));
      db.update_instruction(instruction);

      return <Instruction {...instruction} />;
    },
    {
      params: t.Object({ id: t.Numeric() }),
    },
  )
  .post(
    "/remove_row/:id",
    ({ params }) => {
      let instruction = db.instruction(params.id);
      if (instruction.steps != 0) {
        instruction.steps--;
        instruction.controls.pop();
        db.update_instruction(instruction);
      }

      return <Instruction {...instruction} />;
    },
    {
      params: t.Object({ id: t.Numeric() }),
    },
  )
  .post(
    "/remove_instruction/:id",
    ({ params }) => {
      db.delete_instruction(params.id);
    },
    {
      params: t.Object({ id: t.Numeric() }),
    },
  )
  .post(
    "/update_controls/:id/:i/:j",
    ({ params: { i, j, id }, body }) => {
      let instruction = db.instruction(id);
      instruction.controls[i][j] = body.controls;
      db.update_instruction(instruction);

      return <ControlTableBody {...instruction} />;
    },
    {
      params: t.Object({ id: t.Numeric(), i: t.Numeric(), j: t.Numeric() }),
      body: t.Object({ controls: t.Numeric() }),
    },
  )
  .post(
    "/rename_instruction/:id",
    ({ params: { id }, body }) => {
      let instruction = db.instruction(id);
      instruction.name = body.name;
      db.update_instruction(instruction);
      return <Instruction {...instruction} />;
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ name: t.String() }),
    },
  )

  .listen(6969);
console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

const BaseHtml = ({ children }: elements.Children) => `
<!DOCTYPE html>
<head>
  <title>Micro code generator</title>
  <script src="https://unpkg.com/htmx.org@1.9.5" integrity="sha384-xcuj3WpfgjlKF+FXhSQFQ0ZNr39ln+hwjN3npfM9VBnUskLolQAcN80McRIVOPuO" crossorigin="anonymous"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/hyperscript.org@0.9.11"></script>
</head>
${children}
`;

function InstructionList({ instructions }: { instructions: Instrunction[] }) {
  return (
    <div class="flex flex-col space-y-4 items-center">
      {instructions.map((instruction) => (
        <Instruction {...instruction} />
      ))}
      <AddInstruction />
    </div>
  );
}

function AddInstruction() {
  return (
    <form hx-post="/add_instruction" hx-swap="beforebegin">
      <input type="text" name="name" class="bg-zinc-600" />
      <button type="submit">New instruction</button>
    </form>
  );
}

function Instruction(props: Instrunction) {
  return (
    <div class="instruction">
      <input
        class="text-2xl font-bold text-center bg-zinc-800 w-full focus:outline-none"
        name="name"
        value={props.name}
        hx-post={`/rename_instruction/${props.id}`}
        hx-swap="outerHTML"
        hx-target="closest .instruction"
        hx-trigger="change"
      />
      <ControlsTable {...props} />
      <div class="flex justify-around">
        <button
          hx-post={`/add_row/${props.id}`}
          hx-target="closest .instruction"
          hx-swap="outerHTML"
        >
          Add row
        </button>
        <button
          hx-post={`/remove_row/${props.id}`}
          hx-target="closest .instruction"
          hx-swap="outerHTML"
        >
          Remove row
        </button>
        <button
          hx-post={`/remove_instruction/${props.id}`}
          hx-target="closest .instruction"
          hx-swap="outerHTML"
        >
          Remove instruction
        </button>
      </div>
    </div>
  );
}

const Controls = [
  {
    name: "I reg",
    options: ["Load"],
  },
  {
    name: "Alu",
    options: ["Add", "Sub"],
  },
  {
    name: "MB reg",
    options: ["Load Low", "Load High", "Output"],
  },
  {
    name: "PC reg",
    options: [
      "Load",
      "Load Low",
      "Load High",
      "Output",
      "Output Low",
      "Output High",
      "Increment",
    ],
  },
  {
    name: "A reg",
    options: ["Load", "Output"],
  },
  {
    name: "SP",
    options: ["Output", "Increment", "Decrement"],
  },
];

function ControlsTable(props: Instrunction) {
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          {Controls.map(({ name }) => (
            <th class="px-2 w-24">{name}</th>
          ))}
        </tr>
      </thead>
      <ControlTableBody {...props} />
    </table>
  );
}

function ControlTableBody({ steps, controls, id }: Instrunction) {
  return (
    <tbody>
      {Array.from({ length: steps }).map((_, i) => (
        <tr>
          <td class="px-2">Step {i + 1}</td>
          {Controls.map(({ options }, j) => (
            <td>
              <select
                class="w-full bg-zinc-600"
                name="controls"
                hx-post={`/update_controls/${id}/${i}/${j}`}
                hx-swap="outerHTML"
                hx-target="closest tbody"
              >
                {controls[i][j] == 0 ? (
                  <option selected="selected" value="0">
                    Nop
                  </option>
                ) : (
                  <option value="0">Nop</option>
                )}
                {options.map((option, k) => {
                  if (controls[i][j] == k + 1) {
                    return (
                      <option selected="selected" value={(k + 1).toString()}>
                        {option}
                      </option>
                    );
                  } else {
                    return <option value={(k + 1).toString()}>{option}</option>;
                  }
                })}
              </select>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
