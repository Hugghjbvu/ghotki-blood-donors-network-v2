import React, { useState, useEffect } from "react";

interface HeroTypewriterProps {
  words?: string[];
  speed?: number;
  delay?: number;
  isActive?: boolean;
}

const DEFAULT_WORDS = [
  "Khoon ka Atia dain, keemti khandan bachaen.",
  "Bachaen aik zindagi, Ghotki ke logo ke liye.",
  "Apna khoon, kisi ki dunya hamesha Roshan kare.",
  "Safe blood saves mothers, babies, and accident victims."
];

export default function HeroTypewriter({
  words = DEFAULT_WORDS,
  speed = 75,
  delay = 2200,
  isActive = true,
}: HeroTypewriterProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Pause interval if view is not LANDING or tab is hidden
    if (!isActive || !isTabVisible) {
      return;
    }

    let timer: NodeJS.Timeout;
    const fullWord = words[currentWordIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1));
      }, speed / 2);
    } else {
      timer = setTimeout(() => {
        setCurrentText((prev) => fullWord.slice(0, prev.length + 1));
      }, speed);
    }

    if (!isDeleting && currentText === fullWord) {
      timer = setTimeout(() => setIsDeleting(true), delay);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words, speed, delay, isActive, isTabVisible]);

  return (
    <div className="h-14 sm:h-10 flex items-center justify-center lg:justify-start">
      <p className="text-base sm:text-lg text-gray-600 font-medium">
        <span className="text-blood font-semibold">🩸 </span>
        {currentText}
        <span className="inline-block w-1.5 h-4.5 bg-blood ml-1" />
      </p>
    </div>
  );
}
