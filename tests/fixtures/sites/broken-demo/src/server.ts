import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4100);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Broken Demo Shop</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #171717;
        background: #f5f7fb;
      }
      header {
        align-items: center;
        background: #ffffff;
        border-bottom: 1px solid #d8dee8;
        display: flex;
        justify-content: space-between;
        padding: 18px 28px;
      }
      main {
        display: grid;
        gap: 20px;
        padding: 28px;
      }
      .hero,
      .panel {
        background: #ffffff;
        border: 1px solid #d8dee8;
        border-radius: 8px;
        padding: 22px;
      }
      button,
      a.button {
        background: #0f766e;
        border: 0;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        display: inline-block;
        font-weight: 700;
        padding: 12px 16px;
        text-decoration: none;
      }
      input {
        border: 1px solid #b9c2cf;
        border-radius: 6px;
        min-height: 40px;
        padding: 0 10px;
      }
      .mobile-cta {
        display: inline-block;
      }
      .overflow-fixture {
        width: 720px;
      }
      @media (max-width: 560px) {
        .mobile-cta {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <strong>Broken Demo Shop</strong>
      <nav>
        <a href="/missing">Pricing</a>
        <a href="/agent-lab">Agent lab</a>
        <a href="https://example.com/external">External vendor</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <h1>Checkout flow fixture</h1>
        <p>This fixture intentionally includes deterministic issues for browser-worker tests.</p>
        <button id="checkout-button">Checkout</button>
        <a class="button mobile-cta" href="/trial">Start trial</a>
      </section>
      <section class="panel">
        <h2>Newsletter</h2>
        <input id="newsletter-email" type="email" placeholder="Email address" />
        <button id="newsletter-submit">Subscribe</button>
      </section>
      <section class="panel overflow-fixture">
        <h2>Mobile overflow fixture</h2>
        <p>This panel intentionally exceeds a narrow mobile viewport.</p>
      </section>
      <section class="panel">
        <h2>Safety controls</h2>
        <button id="delete-account-button">Delete account</button>
        <button id="buy-now-button">Buy now</button>
        <input id="password-field" type="password" placeholder="Password" />
      </section>
      <section class="panel">
        <h2>Known controlled issues</h2>
        <ul>
          <li>Broken checkout button</li>
          <li>Missing form label</li>
          <li>Failed API request</li>
          <li>Console error</li>
          <li>Hidden mobile CTA</li>
          <li>Dead navigation link</li>
        </ul>
      </section>
    </main>
    <script>
      console.error("Fixture console error: payment SDK failed to initialize");
      fetch("/api/slow").catch(() => {});
      fetch("/api/failing-request").catch(() => {});
      document.getElementById("checkout-button").addEventListener("click", function () {
        window.dispatchEvent(new CustomEvent("checkout-stalled"));
      });
      document.getElementById("newsletter-submit").addEventListener("click", function () {
        var email = document.getElementById("newsletter-email").value;
        if (!email.includes("@")) {
          alert("Thanks for subscribing");
        }
      });
      var previewButton = document.getElementById("preview-demo-button");
      if (previewButton) {
        previewButton.addEventListener("click", function () {
          var status = document.getElementById("agent-lab-status");
          if (status) {
            status.textContent = "Demo preview failed: the safe journey stalled before confirmation.";
          }
        });
      }
    </script>
  </body>
</html>`;

const agentLabHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Autonomous Agent Lab</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; color: #171717; background: #f5f7fb; }
      main { display: grid; gap: 20px; padding: 28px; }
      .panel { background: #ffffff; border: 1px solid #d8dee8; border-radius: 8px; padding: 22px; }
      button, a.button { background: #0f766e; border: 0; border-radius: 6px; color: white; cursor: pointer; display: inline-block; font-weight: 700; padding: 12px 16px; text-decoration: none; }
      input { border: 1px solid #b9c2cf; border-radius: 6px; min-height: 40px; padding: 0 10px; }
      .error { color: #b91c1c; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>Autonomous Agent Lab</h1>
        <p>This same-origin page provides a safe bounded journey for the mock Browser Agent.</p>
        <label for="agent-search">Search catalog</label>
        <input id="agent-search" type="search" placeholder="Search catalog" />
        <button id="preview-demo-button">Preview demo</button>
        <p id="agent-lab-status" class="error" role="status"></p>
      </section>
      <section class="panel">
        <a class="button" href="/">Back home</a>
        <a href="https://example.com/outside">External support portal</a>
        <button id="lab-delete-button">Delete workspace</button>
        <button id="lab-buy-button">Purchase plan</button>
        <input id="lab-password" type="password" placeholder="Password" />
      </section>
      <script>
        document.getElementById("preview-demo-button").addEventListener("click", function () {
          document.getElementById("agent-lab-status").textContent = "Demo preview failed: the safe journey stalled before confirmation.";
        });
      </script>
    </main>
  </body>
</html>`;

const server = createServer((request, response) => {
  if (request.url === "/api/failing-request") {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Intentional fixture failure" }));
    return;
  }

  if (request.url === "/api/slow") {
    setTimeout(() => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, delayed: true }));
    }, 1800);
    return;
  }

  if (request.url === "/missing") {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Intentional missing page");
    return;
  }

  if (request.url === "/agent-lab") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end(agentLabHtml);
    return;
  }

  response.writeHead(200, { "content-type": "text/html" });
  response.end(html);
});

server.listen(port, () => {
  console.log(`Broken demo site listening on http://localhost:${port}`);
});
