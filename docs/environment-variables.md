# Environment Variables

Avnac reads configuration from environment variables at runtime. Set them in your shell **before** running `wails dev` or the built binary.

---

## Variables

| Variable     | Required | Description                                                         |
| ------------ | -------- | ------------------------------------------------------------------- |
| `BOREAS_URL` | Yes      | Base URL of your Boreas API instance, e.g. `https://boreas.api.url` |

---

## Setting variables & running

### PowerShell (Windows)

```powershell
$env:BOREAS_URL = "https://boreas.api.url"

# Development
wails dev

# Production build
wails build
```

Run the built binary the same way — set the variables first, then launch:

```powershell
$env:BOREAS_URL = "https://boreas.api.url"
.\build\bin\Avnac.exe
```

### Command Prompt (Windows)

```cmd
set BOREAS_URL=https://boreas.api.url

wails dev
```

### Bash / zsh (macOS / Linux)

```bash
export BOREAS_URL="https://boreas.api.url"

wails dev
# or
wails build
```

---

## Persisting variables (optional)

If you don't want to set them every session, add them to your shell profile:

- **PowerShell** — add to `$PROFILE` (`notepad $PROFILE`):

  ```powershell
  $env:BOREAS_URL = "https://boreas.api.url"
  ```

- **Bash / zsh** — add to `~/.bashrc` or `~/.zshrc`:

  ```bash
  export BOREAS_URL="https://boreas.api.url"
  ```

- **Windows system-wide** — set via _System Properties → Environment Variables_ so they apply to all terminals and the installed `.exe`.
