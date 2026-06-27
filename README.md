# Sonar

The browser built for developers.

![Sonar Browser View](https://raw.githubusercontent.com/thecatthatflies/sonar/main/landing/public/screenshots/app-browser.png)

---

## What is Sonar?

Sonar is a cross-platform desktop app that replaces the browser tab you always have open. It auto-discovers every service and port running on your machine, shows them in a sidebar, and lets you inspect and manage your project with ease.

It features a port manager, terminal emulator built in, MCP with your favourite agents, a full browser, and built in DevTools and logging.

---

## Features

### Ports
Sonar's backend detects when new ports arrive and when other ones disappear, and displays the most relevant ones in a beautiful collapsible menu to the side. It can also detect ports that aren't important; apps running on your computer that you aren't working with are filtered out.

You can right-click any port card (or click `⋮`) for a context menu:
- **Open in new tab**: opens in browser tab
- **Copy URL**: copies `http://localhost:PORT`
- **Kill port**: SIGTERM with confirmation dialog
- **Show details**: PID, user, elapsed time, RSS memory, open FDs, full command line
- **Hide**: hides process from sidebar

### Browser
The browser inside Sonar allows you to go anywhere faster. You have the basics from browsers like Chrome and Firefox. Normal web browsing, searching, basic features. But with Sonar, if you type 3000, it'll detect that you're trying to connect to a port, and automatically open localhost:3000. same for 5173, 8080, and any other port.

### Built-in Terminal
Sonar features a native, modern terminal right inside the app. If you're fixing your application, switch to the terminal and do your thing, all without leaving.

### DevTools
Access via `⋮` menu (top right):

- **Inspect page** — native WebKit inspector (Safari Web Inspector) for the active tab
- **Console** — toggles Sonar's log drawer
- **Inspect Sonar** — inspector for Sonar's own React shell
- **Reload Sonar** — full app reload

With Sonar, you can open a native DevTools menu right inside, just like any other browser. But Sonar even allows you to save logs to the app, and view them for future use.

### MCP Server
If you're building your application with an agent, don't worry! Sonar includes a built in MCP server that connects your agent directly to your application. Check out everything that your agent can use Sonar for and installation instructions at [sonardocs.aiyan.tech/mcp.md](sonardocs.aiyan.tech/mcp.md).

---

Have fun with Sonar! Download at [sonar.aiyan.tech](sonar.aiyan.tech).
