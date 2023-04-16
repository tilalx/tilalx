const memeContainer = document.getElementById('meme-container');
const memeImg = document.getElementById('meme');
const loadBtn = document.getElementById('load-btn');
const intervalForm = document.getElementById('interval-form');
const intervalInput = document.getElementById('interval-input');
const stopBtn = document.getElementById('stop-btn');

let intervalId;

async function loadMeme() {
  const res = await fetch('https://meme-api.aelx.de/gimme');
  const data = await res.json();
  memeImg.src = data.url;
}

function startAutoLoad(intervalSeconds) {
  loadMeme();
  intervalId = setInterval(loadMeme, intervalSeconds * 1000);
  loadBtn.classList.remove('btn-active');
  loadBtn.classList.add('btn-disabled');
  intervalForm.classList.add('hidden');
  stopBtn.classList.remove('hidden');
}

function stopAutoLoad() {
  clearInterval(intervalId);
  loadBtn.classList.add('btn-active');
  loadBtn.classList.remove('btn-disabled');
  intervalForm.classList.remove('hidden');
  stopBtn.classList.add('hidden');
}

loadBtn.addEventListener('click', () => {
  loadMeme();
});

intervalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const intervalSeconds = intervalInput.value;
  startAutoLoad(intervalSeconds);
});

stopBtn.addEventListener('click', () => {
  stopAutoLoad();
});

function replaceWithPlaceholder() {
    const memeImg = document.getElementById('meme');
    memeImg.src = 'images/error.jpg';
}

async function makeAsyncRequest() {
  try {
    const response = await fetch('https://n8n.aelx.de/webhook/ip', { mode: 'no-cors' });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
  }

  window.onload = makeAsyncRequest;
  window.onload = loadMeme;