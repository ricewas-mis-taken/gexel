import React, { useState, useEffect } from 'react';
import gameoverSfx from "../../assets/gameover.mp3";

const gameOverAudio = new Audio(gameoverSfx);
gameOverAudio.preload = 'auto';

const injectedCSS = `
  @font-face {
    font-family: 'PokemonClassic';
    src: url('/fonts/PokemonClassic.ttf') format('truetype');
  }

  .loseg-container {
    position: absolute;
    top: 0;
    left:0;
    width: 100%;
      height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    background-color: black;
    animation: fadeToBlack 0.8s ease-in forwards;
  }

  @keyframes fadeToBlack {
    0% { background-color: rgba(0, 0, 0, 0); }
    100% { background-color: rgba(0, 0, 0, 1); }
  }

  .game-over-text {
    font-family: 'PokemonClassic', sans-serif;
    color: red;
    font-size: 4rem;
    text-align: center;
    margin-bottom: 2rem;
    text-shadow: 2px 2px 0px #000;
  }

  .play-again-btn {
    font-family: 'PokemonClassic', sans-serif;
    font-size:1.5rem;
    padding: 15px 30px;
    background-color: transparent;
    color: #2ea84a;
    border: 2px solid #2ea84a;
    cursor: pointer;
    animation: greenPulse 2s ease-in-out infinite alternate;
    transition: transform 0.2s;
  }

  @keyframes greenPulse {
    0% {
      box-shadow: 0 0 5px #2ea84a, inset 0 0 2px #2ea84a;
      text-shadow: 0 0 5px #2ea84a;
    }
    100% {
      box-shadow: 0 0 25px #2ea84a, inset 0 0 10px #2ea84a;
      text-shadow: 0 0 15px #2ea84a;
    }
  }

  .play-again-btn:hover {
    transform: scale(1.1);
  }
`;

const Loseg = ({ onPlayAgain }) => {
  const [step,setStep] = useState('fading');

  useEffect(() => {
      const fadeTimer = setTimeout(() => {
      setStep('gameover');

      gameOverAudio.currentTime = 0;
      gameOverAudio.play().catch(error => {
        console.warn("Audio playback prevented by browser policy:", error);
      });
    }, 800);

    const buttonTimer = setTimeout(() => {
      setStep('button');
    }, 3300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(buttonTimer);
      gameOverAudio.pause();
    };
  }, []);

  return (
    <div className="loseg-container">
      <style>{injectedCSS}</style>

      {(step === 'gameover' || step === 'button') && (
        <h1 className="game-over-text">GAME OVER</h1>
      )}

      {step === 'button' && (
        <button className="play-again-btn" onClick={onPlayAgain}>
          Play Again?
        </button>
      )}
    </div>
  );
};

export default Loseg;
