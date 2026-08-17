const app = document.getElementById("app");
const GAMES_PATH = "games";

/*
 * GitHub Pages project-site 대응:
 * 현재 사이트의 첫 번째 경로 조각을 프로젝트 루트로 사용합니다.
 * 예) https://arcii.github.io/arciilab/home
 *     -> /arciilab
 *
 * 커스텀 도메인이나 username.github.io 루트 사이트에서는 ""가 됩니다.
 */
function getSiteBase() {
    const parts = window.location.pathname.split("/").filter(Boolean);

    // 현재 페이지가 프로젝트 사이트인지 자동 판단하기 위해
    // GitHub Pages project URL에서는 저장소 이름이 첫 번째 조각입니다.
    // 이 프로젝트는 arciilab을 기준으로 동작하도록 아래 값을 사용합니다.
    if (parts.length === 0) return "";

    if (parts[0] === "arciilab.github.io") return "/arciilab.github.io";
    if (parts[0] === "arciilab") return "/arciilab";

    return "";
}

const SITE_BASE = getSiteBase();

function siteURL(path = "") {
    const clean = String(path).replace(/^\/+/, "");
    return `${SITE_BASE}/${clean}`.replace(/\/+$/, "") || "/";
}

function getCurrentRoute() {
    let path = window.location.pathname;

    if (SITE_BASE && path.startsWith(SITE_BASE)) {
        path = path.slice(SITE_BASE.length);
    }

    path = path.replace(/^\/+/, "").replace(/\/+$/, "");

    return path || "home";
}

function goHome() {
    history.pushState({}, "", siteURL("home"));
    loadRoute();
}

async function loadRoute() {
    const route = getCurrentRoute();

    if (route === "home") {
        await loadHome();
        return;
    }

    await loadGame(route);
}

async function loadHome() {
    app.innerHTML = `
        <main class="site-container">
            <header class="site-header">
                <h1 class="site-title">ARCIILAB Mini Games</h1>
                <p class="site-description">작은 게임들을 모아놓은 개인 미니게임 사이트</p>
            </header>
            <section>
                <div id="game-grid" class="game-grid">
                    <div class="loading">게임 목록을 불러오는 중...</div>
                </div>
            </section>
        </main>
    `;

    const grid = document.getElementById("game-grid");

    try {
        const games = await getGames();

        if (games.length === 0) {
            grid.innerHTML = `<div class="error-message">등록된 게임이 없습니다.</div>`;
            return;
        }

        grid.innerHTML = "";

        games.forEach(game => {
            const card = document.createElement("a");
            card.className = "game-card";
            card.href = siteURL(game.slug);

            card.innerHTML = `
                <h2 class="game-card-title">${escapeHTML(game.title)}</h2>
                <p class="game-card-description">${escapeHTML(game.description)}</p>
            `;

            card.addEventListener("click", event => {
                event.preventDefault();
                history.pushState({}, "", siteURL(game.slug));
                loadRoute();
            });

            grid.appendChild(card);
        });
    } catch (error) {
        console.error(error);

        grid.innerHTML = `
            <div class="error-message">
                게임 목록을 불러오지 못했습니다.
                <br><br>
                잠시 후 새로고침하거나 GitHub Pages 배포 상태를 확인해주세요.
            </div>
        `;
    }
}

async function getGames() {
    const apiURL =
        `https://api.github.com/repos/arcii/arciilab.github.io/contents/${GAMES_PATH}`;

    const response = await fetch(apiURL, {
        headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
    }

    const files = await response.json();

    const htmlFiles = files.filter(file =>
        file.type === "file" &&
        file.name.toLowerCase().endsWith(".html")
    );

    const games = await Promise.all(
        htmlFiles.map(async file => {
            let title = makeTitle(file.name.replace(/\.html$/i, ""));
            let description = "ARCIILAB 미니게임";

            // 게임 HTML의 <title>, meta description을 읽어서
            // 별도 app.js 수정 없이 카드에 자동 반영합니다.
            try {
                const text = await fetch(
                    siteURL(`${GAMES_PATH}/${encodeURIComponent(file.name)}`)
                ).then(r => r.ok ? r.text() : "");

                if (text) {
                    const doc = new DOMParser().parseFromString(text, "text/html");
                    const gameTitle = doc.querySelector("title")?.textContent?.trim();
                    const gameDescription =
                        doc.querySelector('meta[name="description"]')?.content?.trim();

                    if (gameTitle) title = gameTitle;
                    if (gameDescription) description = gameDescription;
                }
            } catch (_) {}

            return {
                slug: file.name.replace(/\.html$/i, ""),
                title,
                description,
                filename: file.name
            };
        })
    );

    return games;
}

async function loadGame(slug) {
    app.innerHTML = `<div class="loading">게임을 불러오는 중...</div>`;

    try {
        const filename = `${slug}.html`;
        const gameURL = siteURL(`${GAMES_PATH}/${encodeURIComponent(filename)}`);

        const response = await fetch(gameURL);

        if (!response.ok) {
            throw new Error(`Game not found: ${slug}`);
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const title =
            doc.querySelector("title")?.textContent?.trim() ||
            makeTitle(slug);

        app.innerHTML = `
            <main class="game-page">
                <header class="game-page-header">
                    <h1 class="game-page-title">${escapeHTML(title)}</h1>
                    <a href="${siteURL("home")}" class="home-button" id="home-button">← 홈으로</a>
                </header>
                <section id="game-content"></section>
            </main>
        `;

        const content = document.getElementById("game-content");

        // standalone HTML / fragment 둘 다 지원
        const sourceBody = doc.body;
        Array.from(sourceBody.childNodes).forEach(node => {
            if (node.nodeName.toLowerCase() !== "script") {
                content.appendChild(document.importNode(node, true));
            }
        });

        // 게임 HTML 안의 CSS를 자동으로 적용
        Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
            const href = link.getAttribute("href");
            if (!href) return;

            const styleLink = document.createElement("link");
            styleLink.rel = "stylesheet";
            styleLink.href = new URL(href, gameURL).href;
            document.head.appendChild(styleLink);
        });

        // <style>도 자동 적용
        Array.from(doc.querySelectorAll("style")).forEach(style => {
            const newStyle = document.createElement("style");
            newStyle.textContent = style.textContent;
            document.head.appendChild(newStyle);
        });

        // 외부/내부 JS 모두 자동 실행
        const scripts = Array.from(doc.querySelectorAll("script"));

        for (const oldScript of scripts) {
            const newScript = document.createElement("script");

            Array.from(oldScript.attributes).forEach(attribute => {
                if (attribute.name === "src") {
                    newScript.src =
                        new URL(attribute.value, gameURL).href;
                } else {
                    newScript.setAttribute(
                        attribute.name,
                        attribute.value
                    );
                }
            });

            if (!oldScript.src) {
                newScript.textContent = oldScript.textContent;
            }

            content.appendChild(newScript);
        }

        document.getElementById("home-button").addEventListener("click", event => {
            event.preventDefault();
            goHome();
        });

    } catch (error) {
        console.error(error);

        app.innerHTML = `
            <div class="error-message">
                <h2>게임을 찾을 수 없습니다.</h2>
                <p>존재하지 않는 게임이거나 아직 GitHub Pages에 배포되지 않았습니다.</p>
                <br>
                <a href="${siteURL("home")}" class="home-button" id="error-home-button">
                    홈으로 돌아가기
                </a>
            </div>
        `;

        document.getElementById("error-home-button").addEventListener("click", event => {
            event.preventDefault();
            goHome();
        });
    }
}

function makeTitle(slug) {
    const specialNames = {
        tictactoe: "Tic Tac Toe",
        typing: "Typing Game",
        minesweeper: "Minesweeper",
        snake: "Snake",
        pong: "Pong",
        "2048": "2048"
    };

    if (specialNames[slug]) return specialNames[slug];

    return slug
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.addEventListener("popstate", loadRoute);

loadRoute();
