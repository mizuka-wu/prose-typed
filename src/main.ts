import "./style.css";
import { setupApplication } from "./demo.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>ProseTyped</h1>
    <div class="card">
      <button id="load" type="button">index is 0</button>
    </div>
  </div>
`;

setupApplication(document.querySelector<HTMLButtonElement>("#load")!);
