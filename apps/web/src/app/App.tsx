import { Routes, Route, Link } from "react-router-dom";
export default function App() {
  return (
    <div>
      <nav className="p-4 border-b">
        <Link to="/">apply.ai</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div className="p-6">Web app up</div>} />
      </Routes>
    </div>
  );
}
