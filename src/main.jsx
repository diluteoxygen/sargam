import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from '@vercel/analytics/react';
import App from "./App.jsx";
import AdminApp from "./AdminApp.jsx";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

if (window.location.hash === "#admin") {
  if (import.meta.env.DEV) {
    root.render(<AdminApp />);
  } else {
    window.location.hash = "";
    root.render(
      <React.StrictMode>
        <App />
        <Analytics />
      </React.StrictMode>
    );
  }
} else {
  root.render(
    <React.StrictMode>
      <App />
      <Analytics />
    </React.StrictMode>
  );
}
