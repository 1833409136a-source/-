import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import BankManager from "./routes/BankManager";
import Dashboard from "./routes/Dashboard";
import Practice from "./routes/Practice";
import Settings from "./routes/Settings";
import Stats from "./routes/Stats";
import WrongBook from "./routes/WrongBook";
import { seedInitialQuestions } from "./lib/storage";

export default function App() {
  useEffect(() => {
    void seedInitialQuestions();
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/wrong-book" element={<WrongBook />} />
        <Route path="/bank" element={<BankManager />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
