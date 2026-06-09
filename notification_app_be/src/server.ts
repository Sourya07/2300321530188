import app from "./app";
import { Log } from "logging_middleware";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  Log("backend", "info", "config", `Backend server started on port ${port}`);
});
