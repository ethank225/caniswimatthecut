import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";

function currentRoute() {
  return window.location.hash.replace(/^#/, "") || "/";
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    function onChange() {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  if (route === "/about") return <About />;
  return <Home />;
}
