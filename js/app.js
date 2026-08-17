const OWNER = "arciilab";
const REPOSITORY = "arciilab.github.io";

const GAMES_PATH = "games";


/* =========================================
   GitHub Pages 기본 경로
========================================= */

const BASE_URL = `https://${OWNER}.github.io`;


/* =========================================
   DOM
========================================= */

const app = document.getElementById("app");


/* =========================================
   현재 주소 가져오기
========================================= */

function getCurrentRoute() {

    let path = window.location.pathname;

    // 맨 앞 / 제거
    path = path.replace(/^\/+/, "");

    // 맨 뒤 / 제거
    path = path.replace(/\/+$/, "");

    // 아무것도 없으면 home
    if (!path) {
        return "home";
    }

    return path;
}


/* =========================================
   홈으로 이동
========================================= */

function goHome() {

    history.pushState({}, "", "/home");

    loadRoute();
}


/* =========================================
   라우터
========================================= */

async function loadRoute() {

    const route = getCurrentRoute();

    if (route === "home") {

        await loadHome();

        return;
    }

    await loadGame(route);
}


/* =========================================
   홈페이지
========================================= */

async function loadHome() {

    app.innerHTML = `
        <main class="site-container">

            <header class="site-header">

                <h1 class="site-title">
                    ARCIILAB Mini Games
                </h1>

                <p class="site-description">
                    작은 게임들을 모아놓은 개인 미니게임 사이트
                </p>

            </header>

            <section>

                <div
                    id="game-grid"
                    class="game-grid"
                >
                    <div class="loading">
                        게임 목록을 불러오는 중...
                    </div>
                </div>

            </section>

        </main>
    `;


    const grid = document.getElementById("game-grid");


    try {

        const games = await getGames();


        if (games.length === 0) {

            grid.innerHTML = `
                <div class="error-message">
                    등록된 게임이 없습니다.
                </div>
            `;

            return;
        }


        grid.innerHTML = "";


        games.forEach(game => {

            const card = document.createElement("a");

            card.className = "game-card";

            card.href = `/${game.slug}`;


            card.innerHTML = `
                <h2 class="game-card-title">
                    ${escapeHTML(game.title)}
                </h2>

                <p class="game-card-description">
                    ${escapeHTML(game.description)}
                </p>
            `;


            card.addEventListener("click", event => {

                event.preventDefault();

                history.pushState(
                    {},
                    "",
                    `/${game.slug}`
                );

                loadRoute();
            });


            grid.appendChild(card);
        });

    }

    catch (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="error-message">

                게임 목록을 불러오지 못했습니다.

                <br><br>

                GitHub 저장소 이름이나
                네트워크 상태를 확인해주세요.

            </div>
        `;
    }
}


/* =========================================
   GitHub에서 games 폴더 읽기
========================================= */

async function getGames() {

    const url =
        `https://api.github.com/repos/` +
        `${OWNER}/${REPOSITORY}/contents/${GAMES_PATH}`;


    const response = await fetch(url);


    if (!response.ok) {

        throw new Error(
            `GitHub API Error: ${response.status}`
        );
    }


    const files = await response.json();


    const htmlFiles = files.filter(file => {

        return (
            file.type === "file" &&
            file.name.toLowerCase().endsWith(".html")
        );
    });


    return htmlFiles.map(file => {

        const filename =
            file.name.replace(/\.html$/i, "");


        return {

            slug: filename,

            title: makeTitle(filename),

            description:
                "ARCIILAB 미니게임",

            filename: file.name
        };

    });
}


/* =========================================
   게임 페이지
========================================= */

async function loadGame(slug) {

    app.innerHTML = `
        <div class="loading">
            게임을 불러오는 중...
        </div>
    `;


    try {

        const filename =
            `${slug}.html`;


        const url =
            `${BASE_URL}/${GAMES_PATH}/${filename}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `Game not found: ${slug}`
            );
        }


        const html =
            await response.text();


        app.innerHTML = `

            <main class="game-page">

                <header class="game-page-header">

                    <h1 class="game-page-title">
                        ${escapeHTML(makeTitle(slug))}
                    </h1>

                    <a
                        href="/home"
                        class="home-button"
                        id="home-button"
                    >
                        ← 홈으로
                    </a>

                </header>


                <section id="game-content">
                    ${html}
                </section>

            </main>

        `;


        document
            .getElementById("home-button")
            .addEventListener("click", event => {

                event.preventDefault();

                goHome();
            });


        runGameScripts();

    }

    catch (error) {

        console.error(error);

        app.innerHTML = `

            <div class="error-message">

                <h2>
                    게임을 찾을 수 없습니다.
                </h2>

                <p>
                    존재하지 않는 게임입니다.
                </p>

                <br>

                <a
                    href="/home"
                    class="home-button"
                    id="error-home-button"
                >
                    홈으로 돌아가기
                </a>

            </div>

        `;


        document
            .getElementById("error-home-button")
            .addEventListener("click", event => {

                event.preventDefault();

                goHome();
            });
    }
}


/* =========================================
   HTML 내부 script 실행
========================================= */

function runGameScripts() {

    const scripts =
        document.querySelectorAll(
            "#game-content script"
        );


    scripts.forEach(oldScript => {

        const newScript =
            document.createElement("script");


        Array.from(oldScript.attributes)
            .forEach(attribute => {

                newScript.setAttribute(
                    attribute.name,
                    attribute.value
                );
            });


        newScript.textContent =
            oldScript.textContent;


        oldScript.replaceWith(newScript);
    });
}


/* =========================================
   파일명 → 표시 이름
========================================= */

function makeTitle(slug) {

    const specialNames = {

        tictactoe: "Tic Tac Toe",

        minesweeper: "Minesweeper",

        snake: "Snake",

        pong: "Pong",

        "2048": "2048"
    };


    if (specialNames[slug]) {

        return specialNames[slug];
    }


    return slug
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char =>
            char.toUpperCase()
        );
}


/* =========================================
   HTML escape
========================================= */

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================
   브라우저 뒤로가기 / 앞으로가기
========================================= */

window.addEventListener(
    "popstate",
    loadRoute
);


/* =========================================
   최초 실행
========================================= */

loadRoute();
