let selectedColor = "black";
let selectedDifficulty = "normal";

const BOARD_SIZE = 15;

let board = createEmptyBoard();

let currentTurn = "black";
let gameOver = false;

let lastMove = null;

let aiThinking = false;

let playerColor = "black";
let aiColor = "white";

let aiTimer = null;
let forbiddenTimer = null;


/* =========================
   기본
========================= */

function createEmptyBoard() {

  return Array.from(
    { length: BOARD_SIZE },
    () =>
      Array(
        BOARD_SIZE
      ).fill(null)
  );

}


/* =========================
   DOM
========================= */

const screens = {
  home:
    document.getElementById(
      "homeScreen"
    ),

  setup:
    document.getElementById(
      "setupScreen"
    ),

  game:
    document.getElementById(
      "gameScreen"
    )
};


const canvas =
  document.getElementById(
    "gomokuBoard"
  );


const ctx =
  canvas.getContext("2d");


const resultOverlay =
  document.getElementById(
    "resultOverlay"
  );


const resultTitle =
  document.getElementById(
    "resultTitle"
  );


const resultDescription =
  document.getElementById(
    "resultDescription"
  );


const resultIcon =
  document.getElementById(
    "resultIcon"
  );


const forbiddenMarker =
  document.getElementById(
    "forbiddenMarker"
  );


/* =========================
   화면
========================= */

function showScreen(name) {
  ClubPlay.enter(screens[name].id);

  Object.values(
    screens
  ).forEach(screen => {

    screen.classList.remove(
      "active"
    );

  });


  screens[name]
    .classList.add(
      "active"
    );


  window.scrollTo(
    0,
    0
  );

}


function openGomokuSetup() {

  cancelAiTimer();

  hideResult();

  showScreen(
    "setup"
  );

}


function goHome() {

  cancelAiTimer();

  hideResult();

  showScreen(
    "home"
  );

}


function backToSetup() {

  cancelAiTimer();

  hideResult();

  showScreen(
    "setup"
  );

}





/* =========================
   돌 색 선택
========================= */

document
  .querySelectorAll(
    "#setupScreen .segment[data-color]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            "#setupScreen .segment[data-color]"
          )
          .forEach(item => {

            item.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        selectedColor =
          button.dataset.color;

      }
    );

  });


/* =========================
   난이도
========================= */

document
  .querySelectorAll(
    "#setupScreen .difficulty[data-level]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            "#setupScreen .difficulty[data-level]"
          )
          .forEach(item => {

            item.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        selectedDifficulty =
          button.dataset.level;

      }
    );

  });


/* =========================
   게임 시작
========================= */

function startGame() {

  cancelAiTimer();

  hideResult();

  hideForbiddenMarker();


  resetGameState();


  playerColor =
    selectedColor;


  aiColor =
    playerColor === "black"
      ? "white"
      : "black";


  showScreen(
    "game"
  );


  const difficultyNames = {

normal:
      "보통",

    hard:
      "어려움"

  };


  document.getElementById(
    "difficultyText"
  ).textContent =
    difficultyNames[
      selectedDifficulty
    ];


  document.getElementById(
    "playerStone"
  ).className =
    "status-stone "
    + playerColor;


  updateStatus();


  requestAnimationFrame(
    () => {

      drawBoard();


      if (
        aiColor === "black"
      ) {

        scheduleAiMove();

      }

    }
  );

}


/* =========================
   초기화
========================= */

function resetGameState() {
  ClubUX.begin('gomoku');

  board =
    createEmptyBoard();


  currentTurn =
    "black";


  gameOver =
    false;


  lastMove =
    null;


  aiThinking =
    false;

}


/* =========================
   상태창
========================= */

function updateStatus(
  message = null
) {
  ClubPlay.turn('gomoku',currentTurn);
  if (ClubPlay.local('gomoku')) {
    document.getElementById('playerStone').className='status-stone '+currentTurn;
    document.querySelector('.player-box strong').textContent=message || (gameOver?'게임 종료':ClubPlay.label(currentTurn)+' 차례');
    document.getElementById('difficultyText').textContent='둘이 하기';
    return;
  }

  const status =
    document.querySelector(
      ".player-box strong"
    );


  const statusStone =
    document.getElementById(
      "playerStone"
    );


  statusStone.className =
    "status-stone "
    + playerColor;


  if (message) {

    status.textContent =
      message;

    return;

  }


  if (gameOver) {
    return;
  }


  if (aiThinking) {

    status.textContent =
      "AI가 생각 중...";

    return;

  }


  if (
    ClubPlay.human('gomoku',currentTurn,playerColor)
  ) {

    status.textContent =
      "당신의 차례";

  } else {

    status.textContent =
      "AI의 차례";

  }

}


/* =========================
   보드 그리기
========================= */

function drawBoard() {

  const size =
    700;


  canvas.width =
    size;


  canvas.height =
    size;


  ctx.clearRect(
    0,
    0,
    size,
    size
  );


  const wood =
    ctx.createLinearGradient(
      0,
      0,
      size,
      size
    );


  wood.addColorStop(
    0,
    "#d6a561"
  );


  wood.addColorStop(
    0.48,
    "#ca9551"
  );


  wood.addColorStop(
    1,
    "#b97f40"
  );


  ctx.fillStyle =
    wood;


  ctx.fillRect(
    0,
    0,
    size,
    size
  );


  drawWoodTexture(
    size
  );


  const padding =
    45;


  const usable =
    size
    - padding * 2;


  const gap =
    usable
    / (
      BOARD_SIZE - 1
    );


  ctx.strokeStyle =
    "rgba(61,37,15,0.72)";


  ctx.lineWidth =
    2;


  for (
    let i = 0;
    i < BOARD_SIZE;
    i++
  ) {

    const pos =
      padding
      + gap * i;


    ctx.beginPath();

    ctx.moveTo(
      pos,
      padding
    );

    ctx.lineTo(
      pos,
      size - padding
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
      padding,
      pos
    );

    ctx.lineTo(
      size - padding,
      pos
    );

    ctx.stroke();

  }


  drawStarPoints(
    gap,
    padding
  );


  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let col = 0;
      col < BOARD_SIZE;
      col++
    ) {

      if (
        board[row][col]
      ) {

        drawStone(
          row,
          col,
          board[row][col],
          gap,
          padding
        );

      }

    }

  }


  if (
    lastMove
  ) {

    drawLastMoveMarker(
      lastMove.row,
      lastMove.col,
      gap,
      padding
    );

  }

}


/* =========================
   나무 질감
========================= */

function drawWoodTexture(
  size
) {

  ctx.save();


  ctx.globalAlpha =
    0.08;


  ctx.strokeStyle =
    "#6f4626";


  ctx.lineWidth =
    1;


  for (
    let i = 0;
    i < 24;
    i++
  ) {

    const y =
      (size / 24) * i
      + Math.random() * 8;


    ctx.beginPath();


    ctx.moveTo(
      0,
      y
    );


    ctx.bezierCurveTo(
      size * 0.3,
      y + Math.random() * 10 - 5,
      size * 0.65,
      y + Math.random() * 10 - 5,
      size,
      y
    );


    ctx.stroke();

  }


  ctx.restore();

}


/* =========================
   화점
========================= */

function drawStarPoints(
  gap,
  padding
) {

  const points = [

    [3, 3],

    [11, 3],

    [7, 7],

    [3, 11],

    [11, 11]

  ];


  ctx.fillStyle =
    "rgba(61,37,15,0.84)";


  points.forEach(
    ([col, row]) => {

      ctx.beginPath();


      ctx.arc(
        padding
        + gap * col,

        padding
        + gap * row,

        5,

        0,

        Math.PI * 2
      );


      ctx.fill();

    }
  );

}


/* =========================
   돌
========================= */

function drawStone(
  row,
  col,
  color,
  gap,
  padding
) {

  const x =
    padding
    + col * gap;


  const y =
    padding
    + row * gap;


  const radius =
    gap * 0.43;


  ctx.save();


  ctx.beginPath();


  ctx.arc(
    x + 3,
    y + 5,
    radius,
    0,
    Math.PI * 2
  );


  ctx.fillStyle =
    "rgba(0,0,0,0.23)";


  ctx.fill();


  const gradient =
    ctx.createRadialGradient(

      x - radius * 0.34,

      y - radius * 0.42,

      radius * 0.08,

      x,

      y,

      radius
    );


  if (
    color === "black"
  ) {

    gradient.addColorStop(
      0,
      "#858585"
    );


    gradient.addColorStop(
      0.28,
      "#383838"
    );


    gradient.addColorStop(
      0.7,
      "#111111"
    );


    gradient.addColorStop(
      1,
      "#020202"
    );

  } else {

    gradient.addColorStop(
      0,
      "#ffffff"
    );


    gradient.addColorStop(
      0.55,
      "#f1eee8"
    );


    gradient.addColorStop(
      1,
      "#c8c1b8"
    );

  }


  ctx.beginPath();


  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );


  ctx.fillStyle =
    gradient;


  ctx.fill();


  ctx.restore();

}


/* =========================
   마지막 착수
========================= */

function drawLastMoveMarker(
  row,
  col,
  gap,
  padding
) {

  const x =
    padding
    + col * gap;


  const y =
    padding
    + row * gap;


  ctx.beginPath();


  ctx.arc(
    x,
    y,
    gap * 0.11,
    0,
    Math.PI * 2
  );


  if (
    board[row][col]
    === "black"
  ) {

    ctx.fillStyle =
      "rgba(255,255,255,0.92)";

  } else {

    ctx.fillStyle =
      "rgba(42,36,31,0.9)";

  }


  ctx.fill();

}


/* =========================
   터치
========================= */

canvas.addEventListener(
  "pointerdown",
  handleBoardTap
);


function handleBoardTap(
  event
) {

  if (
    gameOver
    ||
    aiThinking
    ||
    !ClubPlay.human('gomoku', currentTurn, playerColor)
  ) {
    return;
  }


  const rect =
    canvas
      .getBoundingClientRect();


  const scaleX =
    canvas.width
    / rect.width;


  const scaleY =
    canvas.height
    / rect.height;


  const x =
    (
      event.clientX
      - rect.left
    )
    * scaleX;


  const y =
    (
      event.clientY
      - rect.top
    )
    * scaleY;


  const padding =
    45;


  const gap =
    (
      canvas.width
      - padding * 2
    )
    /
    (
      BOARD_SIZE - 1
    );


  const col =
    Math.round(
      (
        x - padding
      )
      / gap
    );


  const row =
    Math.round(
      (
        y - padding
      )
      / gap
    );


  if (
    !isInside(
      row,
      col
    )
  ) {
    return;
  }


  const pointX =
    padding
    + col * gap;


  const pointY =
    padding
    + row * gap;


  const distance =
    Math.sqrt(

      Math.pow(
        x - pointX,
        2
      )

      +

      Math.pow(
        y - pointY,
        2
      )

    );


  if (
    distance
    > gap * 0.48
  ) {
    return;
  }


  if (
    board[row][col]
  ) {
    return;
  }


  playerMove(
    row,
    col
  );

}


/* =========================
   플레이어 착수
========================= */

function playerMove(
  row,
  col
) {
  const mover = currentTurn;
  if (!isInside(row,col) || board[row][col]) return;

  if (
    gameOver
    ||
    aiThinking
    ||
    !ClubPlay.human('gomoku', currentTurn, playerColor)
  ) {
    return;
  }


  if (
    mover === "black"
  ) {

    const forbidden =
      getForbiddenMoveType(
        row,
        col
      );


    if (
      forbidden
    ) {

      showForbiddenMarker(
        row,
        col
      );


      showForbiddenMessage(
        forbidden
      );


      return;

    }

  }


  hideForbiddenMarker();


  board[row][col] =
    mover;


  lastMove = {
    row,
    col
  };
  ClubUX.action('gameScreen','place');


  drawBoard();


  if (
    checkWinRenju(
      row,
      col,
      mover
    )
  ) {

    finishGame(
      ClubPlay.local('gomoku') ? mover : "player"
    );


    return;

  }


  if (
    isBoardFull()
  ) {

    finishGame(
      "draw"
    );


    return;

  }


  currentTurn =
    mover === "black" ? "white" : "black";


  updateStatus();
  scheduleAiMove();

}


/* =========================
   금수 표시
========================= */

function showForbiddenMarker(
  row,
  col
) {

  clearTimeout(
    forbiddenTimer
  );


  const boardRect =
    canvas
      .getBoundingClientRect();


  const wrapperRect =
    canvas
      .parentElement
      .getBoundingClientRect();


  const padding =
    45;


  const internalGap =
    (
      canvas.width
      - padding * 2
    )
    /
    (
      BOARD_SIZE - 1
    );


  const internalX =
    padding
    + col * internalGap;


  const internalY =
    padding
    + row * internalGap;


  const x =
    (
      internalX
      / canvas.width
    )
    * boardRect.width;


  const y =
    (
      internalY
      / canvas.height
    )
    * boardRect.height;


  forbiddenMarker.style.left =
    (
      boardRect.left
      - wrapperRect.left
      + x
    )
    + "px";


  forbiddenMarker.style.top =
    (
      boardRect.top
      - wrapperRect.top
      + y
    )
    + "px";


  forbiddenMarker.classList.add(
    "show"
  );


  forbiddenTimer =
    setTimeout(
      hideForbiddenMarker,
      900
    );

}


function hideForbiddenMarker() {

  if (
    forbiddenMarker
  ) {

    forbiddenMarker
      .classList
      .remove(
        "show"
      );

  }

}


/* =========================
   금수 메시지
========================= */

function showForbiddenMessage(
  type
) {

  const messages = {

    overline:
      "장목 금수",

    doubleThree:
      "3-3 금수",

    doubleFour:
      "4-4 금수"

  };


  updateStatus(
    messages[type]
    || "금수입니다"
  );


  setTimeout(
    () => {

      if (
        !gameOver
        &&
        ClubPlay.human('gomoku',currentTurn,playerColor)
      ) {

        updateStatus();

      }

    },
    900
  );

}


/* =========================
   AI 타이머
========================= */

function cancelAiTimer() {

  if (
    aiTimer
  ) {

    clearTimeout(
      aiTimer
    );


    aiTimer =
      null;

  }


  aiThinking =
    false;

}


function scheduleAiMove() {
  if (!ClubPlay.ai('gomoku') || currentTurn !== aiColor) return;

  if (
    gameOver
  ) {
    return;
  }


  cancelAiTimer();


  aiThinking =
    true;


  updateStatus();


  const delay =
    selectedDifficulty
      === "hard"
      ? 500
      : 370;


  aiTimer =
    setTimeout(
      () => {

        aiTimer =
          null;


        if (
          gameOver
        ) {
          return;
        }


        makeAiMove();

      },
      delay
    );

}


/* =========================
   AI 착수
========================= */

function makeAiMove() {
  if (!ClubPlay.ai('gomoku') || currentTurn !== aiColor) return;

  if (
    gameOver
  ) {
    return;
  }


  let move;


  if (
    selectedDifficulty
    === "normal"
  ) {

    move =
      getNormalAiMove();

  } else {

    move =
      getHardAiMove();

  }


  if (
    !move
  ) {

    aiThinking =
      false;


    finishGame(
      "draw"
    );


    return;

  }


  board[
    move.row
  ][
    move.col
  ] =
    aiColor;


  lastMove = {
    row:
      move.row,

    col:
      move.col
  };
  ClubUX.action('gameScreen','place');


  aiThinking =
    false;


  drawBoard();


  if (
    checkWinRenju(
      move.row,
      move.col,
      aiColor
    )
  ) {

    finishGame(
      "ai"
    );


    return;

  }


  if (
    isBoardFull()
  ) {

    finishGame(
      "draw"
    );


    return;

  }


  currentTurn =
    playerColor;


  updateStatus();

}


/* =========================
   게임 종료
========================= */

function finishGame(
  result
) {

  if (gameOver) return;
  if (ClubPlay.local('gomoku')) {
    gameOver=true; cancelAiTimer(); ClubUX.result('gomoku',result);
    const text=result==='draw'?'무승부':ClubPlay.label(result)+' 승리!';
    updateStatus(text); showResult('draw'); resultTitle.textContent=text; resultDescription.textContent='좋은 승부였어요. 한 판 더 둘까요?'; return;
  }
  ClubUX.result('gomoku', result === 'player' ? playerColor : result === 'ai' ? aiColor : 'draw');
  gameOver =
    true;


  aiThinking =
    false;


  cancelAiTimer();


  if (
    result === "player"
  ) {

    updateStatus(
      "당신의 승리!"
    );


    showResult(
      "player"
    );

    return;

  }


  if (
    result === "ai"
  ) {

    updateStatus(
      "AI 승리"
    );


    showResult(
      "ai"
    );

    return;

  }


  updateStatus(
    "무승부"
  );


  showResult(
    "draw"
  );

}


/* =========================
   결과 모달
========================= */

function showResult(
  type
) {

  if (
    type === "player"
  ) {

    resultIcon.textContent =
      "✓";


    resultTitle.textContent =
      "당신의 승리!";


    resultDescription.textContent =
      "좋은 수였어요. 한 판 더 둘까요?";

  } else if (
    type === "ai"
  ) {

    resultIcon.textContent =
      "●";


    resultTitle.textContent =
      "AI 승리";


    resultDescription.textContent =
      "이번 판은 AI가 가져갔어요.";

  } else {

    resultIcon.textContent =
      "＝";


    resultTitle.textContent =
      "무승부";


    resultDescription.textContent =
      "끝까지 팽팽한 승부였어요.";

  }


  resultOverlay.classList.add(
    "show"
  );


  resultOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

}


function hideResult() {

  if (
    !resultOverlay
  ) {
    return;
  }


  resultOverlay.classList.remove(
    "show"
  );


  resultOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* =========================
   다시 하기
========================= */

function playAgain() {

  hideResult();

  resetBoard();

}


/* =========================
   설정으로
========================= */

function returnToSetupFromResult() {

  hideResult();

  cancelAiTimer();

  showScreen(
    "setup"
  );

}


/* =========================
   보통 AI
========================= */

function getNormalAiMove() {

  const candidates =
    getLegalCandidateMoves(
      2
    );


  if (
    candidates.length === 0
  ) {
    return null;
  }


  const winningMove =
    findImmediateWin(
      candidates,
      aiColor
    );


  if (
    winningMove
  ) {
    return winningMove;
  }


  const playerMoves =
    getLegalMovesForColor(
      playerColor,
      2
    );


  const blockingMove =
    findImmediateWin(
      playerMoves,
      playerColor
    );


  if (
    blockingMove
    &&
    isLegalMoveForColor(
      blockingMove.row,
      blockingMove.col,
      aiColor
    )
  ) {

    return blockingMove;

  }


  let bestMove =
    null;


  let bestScore =
    -Infinity;


  for (
    const move
    of candidates
  ) {

    const attack =
      evaluateMoveBasic(
        move.row,
        move.col,
        aiColor
      );


    const defense =
      evaluateMoveBasic(
        move.row,
        move.col,
        playerColor
      );


    const score =
      attack * 1.12
      +
      defense
      +
      getCenterBonus(
        move.row,
        move.col
      )
      +
      Math.random();


    if (
      score
      > bestScore
    ) {

      bestScore =
        score;


      bestMove =
        move;

    }

  }


  return bestMove;

}


/* =========================
   어려움 AI
========================= */

function getHardAiMove() {

  const candidates =
    getLegalCandidateMoves(
      2
    );


  if (
    candidates.length === 0
  ) {
    return null;
  }


  const aiWin =
    findImmediateWin(
      candidates,
      aiColor
    );


  if (
    aiWin
  ) {
    return aiWin;
  }


  const playerCandidates =
    getLegalMovesForColor(
      playerColor,
      2
    );


  const playerWin =
    findImmediateWin(
      playerCandidates,
      playerColor
    );


  if (
    playerWin
    &&
    isLegalMoveForColor(
      playerWin.row,
      playerWin.col,
      aiColor
    )
  ) {

    return playerWin;

  }


  const ranked =
    candidates
      .map(move => {

        const attack =
          evaluateMoveAdvanced(
            move.row,
            move.col,
            aiColor
          );


        const defense =
          evaluateMoveAdvanced(
            move.row,
            move.col,
            playerColor
          );


        return {

          ...move,

          roughScore:

            attack * 1.18

            +

            defense * 1.08

            +

            getCenterBonus(
              move.row,
              move.col
            )

        };

      })
      .sort(
        (a, b) =>
          b.roughScore
          - a.roughScore
      );


  const topCandidates =
    ranked.slice(
      0,
      18
    );


  let bestMove =
    null;


  let bestScore =
    -Infinity;


  for (
    const move
    of topCandidates
  ) {

    board[
      move.row
    ][
      move.col
    ] =
      aiColor;


    const attackScore =
      evaluateBoardPosition(
        move.row,
        move.col,
        aiColor
      );


    const opponentCandidates =
      getLegalMovesForColor(
        playerColor,
        2
      );


    let strongestReply =
      0;


    for (
      const reply
      of opponentCandidates.slice(
        0,
        28
      )
    ) {

      if (
        board[
          reply.row
        ][
          reply.col
        ]
      ) {
        continue;
      }


      const replyScore =
        evaluateMoveAdvanced(
          reply.row,
          reply.col,
          playerColor
        );


      strongestReply =
        Math.max(
          strongestReply,
          replyScore
        );

    }


    board[
      move.row
    ][
      move.col
    ] =
      null;


    const threats =
      countThreatsAfterMove(
        move.row,
        move.col,
        aiColor
      );


    const danger =
      evaluateMoveAdvanced(
        move.row,
        move.col,
        playerColor
      );


    let score =

      attackScore * 1.25

      -

      strongestReply * 0.5

      +

      move.roughScore

      +

      threats.openFour
      * 145000

      +

      threats.four
      * 52000

      +

      threats.openThree
      * 14500

      +

      danger * 0.76

      +

      Math.random()
      * 0.5;


    if (
      score
      > bestScore
    ) {

      bestScore =
        score;


      bestMove = {

        row:
          move.row,

        col:
          move.col

      };

    }

  }


  return (
    bestMove
    ||
    ranked[0]
    ||
    null
  );

}


/* =========================
   합법 후보
========================= */

function getLegalCandidateMoves(
  distance = 2
) {

  return getLegalMovesForColor(
    aiColor,
    distance
  );

}


function getLegalMovesForColor(
  color,
  distance = 2
) {

  const base =
    getCandidateMoves(
      distance
    );


  return base.filter(
    move =>
      isLegalMoveForColor(
        move.row,
        move.col,
        color
      )
  );

}


function isLegalMoveForColor(
  row,
  col,
  color
) {

  if (
    board[row][col]
  ) {
    return false;
  }


  if (
    color !== "black"
  ) {
    return true;
  }


  return !getForbiddenMoveType(
    row,
    col
  );

}


/* =========================
   후보 생성
========================= */

function getCandidateMoves(
  distance = 2
) {

  if (
    isBoardEmpty()
  ) {

    return [
      {
        row: 7,
        col: 7
      }
    ];

  }


  const candidates =
    [];


  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let col = 0;
      col < BOARD_SIZE;
      col++
    ) {

      if (
        board[row][col]
      ) {
        continue;
      }


      if (
        hasNearbyStone(
          row,
          col,
          distance
        )
      ) {

        candidates.push(
          {
            row,
            col
          }
        );

      }

    }

  }


  return candidates;

}


/* =========================
   렌주 금수
========================= */

function getForbiddenMoveType(
  row,
  col
) {

  if (
    board[row][col]
  ) {
    return null;
  }


  board[row][col] =
    "black";


  const exactFive =
    hasExactFive(
      row,
      col,
      "black"
    );


  if (
    exactFive
  ) {

    board[row][col] =
      null;


    return null;

  }


  if (
    hasOverline(
      row,
      col,
      "black"
    )
  ) {

    board[row][col] =
      null;


    return "overline";

  }


  let fourCount =
    0;


  let threeCount =
    0;


  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  for (
    const [dr, dc]
    of directions
  ) {

    const line =
      getDirectionalString(
        row,
        col,
        dr,
        dc,
        "black",
        5
      );


    if (
      isFourThreat(
        line
      )
    ) {

      fourCount++;

    }


    if (
      isOpenThreeThreat(
        line
      )
    ) {

      threeCount++;

    }

  }


  board[row][col] =
    null;


  if (
    fourCount >= 2
  ) {

    return "doubleFour";

  }


  if (
    threeCount >= 2
  ) {

    return "doubleThree";

  }


  return null;

}


/* =========================
   5목 / 장목
========================= */

function hasExactFive(
  row,
  col,
  color
) {

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  for (
    const [dr, dc]
    of directions
  ) {

    const count =

      1

      +

      countDirection(
        row,
        col,
        dr,
        dc,
        color
      )

      +

      countDirection(
        row,
        col,
        -dr,
        -dc,
        color
      );


    if (
      count === 5
    ) {

      return true;

    }

  }


  return false;

}


function hasOverline(
  row,
  col,
  color
) {

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  for (
    const [dr, dc]
    of directions
  ) {

    const count =

      1

      +

      countDirection(
        row,
        col,
        dr,
        dc,
        color
      )

      +

      countDirection(
        row,
        col,
        -dr,
        -dc,
        color
      );


    if (
      count >= 6
    ) {

      return true;

    }

  }


  return false;

}


/* =========================
   금수 패턴
========================= */

function getDirectionalString(
  row,
  col,
  dr,
  dc,
  color,
  range = 5
) {

  let result =
    "";


  for (
    let offset = -range;
    offset <= range;
    offset++
  ) {

    const r =
      row
      + dr * offset;


    const c =
      col
      + dc * offset;


    if (
      !isInside(
        r,
        c
      )
    ) {

      result +=
        "X";


      continue;

    }


    if (
      board[r][c]
      === color
    ) {

      result +=
        "O";

    } else if (
      board[r][c]
      === null
    ) {

      result +=
        ".";

    } else {

      result +=
        "X";

    }

  }


  return result;

}


function isFourThreat(
  line
) {

  const patterns = [

    ".OOOO.",

    "XOOOO.",

    ".OOOOX",

    ".OOO.O.",

    ".OO.OO.",

    ".O.OOO.",

    "OOO.O",

    "OO.OO",

    "O.OOO"

  ];


  return patterns.some(
    pattern =>
      line.includes(
        pattern
      )
  );

}


function isOpenThreeThreat(
  line
) {

  const patterns = [

    "..OOO..",

    ".OOO..",

    "..OOO.",

    ".OO.O.",

    ".O.OO.",

    "..OO.O..",

    "..O.OO.."

  ];


  return patterns.some(
    pattern =>
      line.includes(
        pattern
      )
  );

}


/* =========================
   승리 판정
========================= */

function checkWinRenju(
  row,
  col,
  color
) {

  if (
    color === "white"
  ) {

    return checkWin(
      row,
      col,
      color
    );

  }


  return hasExactFive(
    row,
    col,
    color
  );

}


function checkWin(
  row,
  col,
  color
) {

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  for (
    const [dr, dc]
    of directions
  ) {

    const count =

      1

      +

      countDirection(
        row,
        col,
        dr,
        dc,
        color
      )

      +

      countDirection(
        row,
        col,
        -dr,
        -dc,
        color
      );


    if (
      count >= 5
    ) {

      return true;

    }

  }


  return false;

}


function countDirection(
  row,
  col,
  dr,
  dc,
  color
) {

  let count =
    0;


  let r =
    row + dr;


  let c =
    col + dc;


  while (

    isInside(
      r,
      c
    )

    &&

    board[r][c]
      === color

  ) {

    count++;


    r += dr;

    c += dc;

  }


  return count;

}


/* =========================
   즉시 승리
========================= */

function findImmediateWin(
  candidates,
  color
) {

  for (
    const move
    of candidates
  ) {

    if (
      board[
        move.row
      ][
        move.col
      ]
    ) {
      continue;
    }


    if (
      !isLegalMoveForColor(
        move.row,
        move.col,
        color
      )
    ) {
      continue;
    }


    board[
      move.row
    ][
      move.col
    ] =
      color;


    const win =
      checkWinRenju(
        move.row,
        move.col,
        color
      );


    board[
      move.row
    ][
      move.col
    ] =
      null;


    if (
      win
    ) {

      return move;

    }

  }


  return null;

}


/* =========================
   기본 AI 평가
========================= */

function evaluateMoveBasic(
  row,
  col,
  color
) {

  if (
    board[row][col]
  ) {

    return -Infinity;

  }


  board[row][col] =
    color;


  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  let score =
    0;


  for (
    const [dr, dc]
    of directions
  ) {

    const line =
      analyzeStraightLine(
        row,
        col,
        dr,
        dc,
        color
      );


    score +=
      scoreBasicLine(
        line.count,
        line.openEnds
      );

  }


  board[row][col] =
    null;


  return score;

}


/* =========================
   고급 평가
========================= */

function evaluateMoveAdvanced(
  row,
  col,
  color
) {

  if (
    board[row][col]
  ) {

    return -Infinity;

  }


  board[row][col] =
    color;


  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  let score =
    0;


  let strongDirections =
    0;


  for (
    const [dr, dc]
    of directions
  ) {

    const pattern =
      getLinePattern(
        row,
        col,
        dr,
        dc,
        color
      );


    const patternScore =
      scorePattern(
        pattern
      );


    score +=
      patternScore;


    if (
      patternScore
      >= 6000
    ) {

      strongDirections++;

    }

  }


  if (
    strongDirections >= 2
  ) {

    score +=
      strongDirections
      * 18000;

  }


  board[row][col] =
    null;


  return score;

}


/* =========================
   보드 평가
========================= */

function evaluateBoardPosition(
  row,
  col,
  color
) {

  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  let score =
    0;


  for (
    const [dr, dc]
    of directions
  ) {

    const pattern =
      getLinePattern(
        row,
        col,
        dr,
        dc,
        color
      );


    score +=
      scorePattern(
        pattern
      );

  }


  return score;

}


/* =========================
   직선 분석
========================= */

function analyzeStraightLine(
  row,
  col,
  dr,
  dc,
  color
) {

  let count =
    1;


  let openEnds =
    0;


  let r =
    row + dr;


  let c =
    col + dc;


  while (

    isInside(
      r,
      c
    )

    &&

    board[r][c]
      === color

  ) {

    count++;


    r += dr;

    c += dc;

  }


  if (

    isInside(
      r,
      c
    )

    &&

    board[r][c]
      === null

  ) {

    openEnds++;

  }


  r =
    row - dr;


  c =
    col - dc;


  while (

    isInside(
      r,
      c
    )

    &&

    board[r][c]
      === color

  ) {

    count++;


    r -= dr;

    c -= dc;

  }


  if (

    isInside(
      r,
      c
    )

    &&

    board[r][c]
      === null

  ) {

    openEnds++;

  }


  return {
    count,
    openEnds
  };

}


/* =========================
   기본 점수
========================= */

function scoreBasicLine(
  count,
  openEnds
) {

  if (
    count >= 5
  ) {
    return 1000000;
  }


  if (
    count === 4
    &&
    openEnds === 2
  ) {
    return 120000;
  }


  if (
    count === 4
    &&
    openEnds === 1
  ) {
    return 30000;
  }


  if (
    count === 3
    &&
    openEnds === 2
  ) {
    return 9000;
  }


  if (
    count === 3
    &&
    openEnds === 1
  ) {
    return 1400;
  }


  if (
    count === 2
    &&
    openEnds === 2
  ) {
    return 500;
  }


  if (
    count === 2
    &&
    openEnds === 1
  ) {
    return 90;
  }


  return 10;

}


/* =========================
   패턴 문자열
========================= */

function getLinePattern(
  row,
  col,
  dr,
  dc,
  color
) {

  let pattern =
    "";


  for (
    let offset = -5;
    offset <= 5;
    offset++
  ) {

    const r =
      row
      + dr * offset;


    const c =
      col
      + dc * offset;


    if (
      !isInside(
        r,
        c
      )
    ) {

      pattern +=
        "X";


      continue;

    }


    if (
      board[r][c]
      === color
    ) {

      pattern +=
        "O";

    } else if (
      board[r][c]
      === null
    ) {

      pattern +=
        ".";

    } else {

      pattern +=
        "X";

    }

  }


  return pattern;

}


/* =========================
   패턴 점수
========================= */

function scorePattern(
  pattern
) {

  if (
    pattern.includes(
      "OOOOO"
    )
  ) {

    return 1000000;

  }


  if (
    pattern.includes(
      ".OOOO."
    )
  ) {

    return 180000;

  }


  const brokenFourPatterns = [

    ".OOO.O.",

    ".OO.OO.",

    ".O.OOO.",

    "XOOOO.",

    ".OOOOX"

  ];


  for (
    const p
    of brokenFourPatterns
  ) {

    if (
      pattern.includes(
        p
      )
    ) {

      return 70000;

    }

  }


  const openThreePatterns = [

    "..OOO..",

    ".OOO..",

    "..OOO.",

    ".OO.O.",

    ".O.OO."

  ];


  for (
    const p
    of openThreePatterns
  ) {

    if (
      pattern.includes(
        p
      )
    ) {

      return 12000;

    }

  }


  const threePatterns = [

    "XOOO.",

    ".OOOX",

    "XOO.O",

    "O.OOX"

  ];


  for (
    const p
    of threePatterns
  ) {

    if (
      pattern.includes(
        p
      )
    ) {

      return 2500;

    }

  }


  const openTwoPatterns = [

    "..OO..",

    ".O.O.",

    ".OO..."

  ];


  for (
    const p
    of openTwoPatterns
  ) {

    if (
      pattern.includes(
        p
      )
    ) {

      return 650;

    }

  }


  return 20;

}


/* =========================
   복합 위협
========================= */

function countThreatsAfterMove(
  row,
  col,
  color
) {

  if (
    board[row][col]
  ) {

    return {

      openFour: 0,

      four: 0,

      openThree: 0

    };

  }


  board[row][col] =
    color;


  const directions = [

    [0, 1],

    [1, 0],

    [1, 1],

    [1, -1]

  ];


  let openFour =
    0;


  let four =
    0;


  let openThree =
    0;


  for (
    const [dr, dc]
    of directions
  ) {

    const pattern =
      getLinePattern(
        row,
        col,
        dr,
        dc,
        color
      );


    if (
      pattern.includes(
        ".OOOO."
      )
    ) {

      openFour++;

    } else if (

      pattern.includes(
        "OOOO"
      )

      ||

      pattern.includes(
        "OOO.O"
      )

      ||

      pattern.includes(
        "OO.OO"
      )

      ||

      pattern.includes(
        "O.OOO"
      )

    ) {

      four++;

    }


    if (

      pattern.includes(
        ".OOO."
      )

      ||

      pattern.includes(
        ".OO.O."
      )

      ||

      pattern.includes(
        ".O.OO."
      )

    ) {

      openThree++;

    }

  }


  board[row][col] =
    null;


  return {

    openFour,

    four,

    openThree

  };

}


/* =========================
   중앙 보너스
========================= */

function getCenterBonus(
  row,
  col
) {

  const distance =

    Math.abs(
      row - 7
    )

    +

    Math.abs(
      col - 7
    );


  return (

    Math.max(
      0,
      14 - distance
    )

    * 3

  );

}


/* =========================
   주변 돌
========================= */

function hasNearbyStone(
  row,
  col,
  distance
) {

  for (
    let dr = -distance;
    dr <= distance;
    dr++
  ) {

    for (
      let dc = -distance;
      dc <= distance;
      dc++
    ) {

      if (
        dr === 0
        &&
        dc === 0
      ) {
        continue;
      }


      const r =
        row + dr;


      const c =
        col + dc;


      if (

        isInside(
          r,
          c
        )

        &&

        board[r][c]

      ) {

        return true;

      }

    }

  }


  return false;

}


/* =========================
   좌표
========================= */

function isInside(
  row,
  col
) {

  return (

    row >= 0

    &&

    row < BOARD_SIZE

    &&

    col >= 0

    &&

    col < BOARD_SIZE

  );

}


/* =========================
   빈 판
========================= */

function isBoardEmpty() {

  return board.every(

    row =>
      row.every(

        cell =>
          cell === null

      )

  );

}


/* =========================
   판 가득 참
========================= */

function isBoardFull() {

  return board.every(

    row =>
      row.every(

        cell =>
          cell !== null

      )

  );

}


/* =========================
   새 게임
========================= */

function resetBoard() {

  cancelAiTimer();

  hideResult();

  hideForbiddenMarker();


  resetGameState();


  playerColor =
    selectedColor;


  aiColor =
    playerColor === "black"
      ? "white"
      : "black";


  drawBoard();

  updateStatus();


  if (
    aiColor === "black"
  ) {

    scheduleAiMove();

  }

}


/* =========================
   리사이즈
========================= */

window.addEventListener(
  "resize",
  () => {

    if (
      screens.game
        .classList
        .contains(
          "active"
        )
    ) {

      drawBoard();

    }

  }
);
ClubPlay.register('gomoku', () => {cancelAiTimer();clearTimeout(forbiddenTimer);hideForbiddenMarker();});
