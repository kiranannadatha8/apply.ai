import { createRoot } from "react-dom/client";
function Popup() {
  return (
    <div style={{ padding: 12, width: 320 }}>apply.ai extension ready</div>
  );
}
createRoot(document.getElementById("root")!).render(<Popup />);
