import { Link } from "react-router";
import { motion } from "motion/react";
import { Wordmark } from "../components/brand";
import { Button } from "../components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Wordmark />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <div className="font-serif text-[7rem] leading-none text-[var(--color-ink)]">
          404
        </div>
        <p className="text-[var(--color-ink-soft)] mt-4 text-lg">
          This page drifted off the map.
        </p>
        <Link to="/" className="mt-8">
          <Button size="lg">Back to safety</Button>
        </Link>
      </motion.div>
    </div>
  );
}
