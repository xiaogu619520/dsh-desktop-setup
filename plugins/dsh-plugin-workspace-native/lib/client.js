window.__ModuleLoader__.load({
  id: "dsh-plugin-workspace-native",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");

    function NativeDirectoryFlow(props) {
      const { open, onPicked, onCancel, onError, connection } = props;
      const armed = React.useRef(false);
      const outcome = React.useRef(props);
      outcome.current = props;
      const alive = React.useRef(true);

      React.useEffect(() => {
        alive.current = true;
        return () => {
          alive.current = false;
        };
      }, []);

      React.useEffect(() => {
        if (!open) {
          armed.current = false;
          return;
        }
        if (armed.current) return;
        armed.current = true;

        if (!connection || typeof connection.call !== "function") {
          if (outcome.current.onError) outcome.current.onError("RPC connection unavailable");
          return;
        }

        connection.call("dsh-workspace-native:pick", {}).then((res) => {
          if (!alive.current) return;
          if (res && res.ok) {
            if (res.path) {
              outcome.current.onPicked(res.path);
            } else {
              outcome.current.onCancel();
            }
          } else {
            const err = (res && res.error) || "Failed to pick folder";
            if (outcome.current.onError) outcome.current.onError(err);
            else outcome.current.onCancel();
          }
        }).catch((err) => {
          if (!alive.current) return;
          const msg = err instanceof Error ? err.message : String(err);
          if (outcome.current.onError) outcome.current.onError(msg);
          else outcome.current.onCancel();
        });
      }, [open, connection]);

      return null;
    }

    const inject = ["slots", "workspaces", "connection"];

    function apply(ctx) {
      const injected = () => ({
        workspaces: ctx.get("workspaces"),
        connection: ctx.get("connection")
      });

      if (typeof document !== "undefined") {
        let depth = 0;
        const hasFiles = (e) => e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes("Files");

        document.addEventListener("dragenter", (e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth += 1;
        }, true);

        document.addEventListener("dragover", (e) => {
          if (!hasFiles(e) || !e.dataTransfer) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }, true);

        document.addEventListener("dragleave", (e) => {
          if (!hasFiles(e)) return;
          depth = Math.max(0, depth - 1);
        }, true);

        document.addEventListener("drop", (e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          depth = 0;

          const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
          const dropped = files.find((f) => typeof f.path === "string" && f.path !== "");
          if (!dropped || !dropped.path) return;

          const workspaces = ctx.get("workspaces");
          const sessions = ctx.get("sessions");
          if (workspaces && typeof workspaces.create === "function") {
            workspaces.create({ path: dropped.path }).then((ws) => {
              if (workspaces.startSession) workspaces.startSession(ws.workspaceId);
              if (sessions && ws.sessionIds && ws.sessionIds[0]) {
                sessions.open(ws.sessionIds[0]);
              }
            }).catch(() => {});
          }
        }, true);
      }

      ctx.slots.inject("conversation.hero.workspace.directoryFlow", () => {
        return ctx.slots.inject("sidebar.workspaces.directoryFlow", function* () {
          yield ctx.slots.register({
            name: "conversation.hero.workspace.directoryFlow",
            priority: -20,
            inject: injected
          }, NativeDirectoryFlow);

          yield ctx.slots.register({
            name: "sidebar.workspaces.directoryFlow",
            priority: -20,
            inject: injected
          }, NativeDirectoryFlow);
        });
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
