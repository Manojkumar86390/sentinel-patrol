"use client";

import React from "react";
import { motion } from "framer-motion";

interface SectionWithMockupProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  reverseLayout?: boolean;
}

export function SectionWithMockup({
  title,
  description,
  primary,
  secondary,
  reverseLayout = false,
}: SectionWithMockupProps) {
  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.2 } } };
  const itemVariants = {
    hidden:  { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
  };

  const layoutClasses  = reverseLayout ? "md:grid-cols-2 md:grid-flow-col-dense" : "md:grid-cols-2";
  const textOrderClass = reverseLayout ? "md:col-start-2" : "";
  const mockOrderClass = reverseLayout ? "md:col-start-1" : "";

  return (
    <section className="relative py-20 md:py-32 bg-[var(--color-bg)] overflow-hidden">
      <div className="container max-w-[1220px] w-full px-6 md:px-10 relative z-10 mx-auto">
        <motion.div
          className={`grid grid-cols-1 gap-12 md:gap-8 w-full items-center ${layoutClasses}`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className={`flex flex-col items-start gap-4 max-w-[546px] mx-auto md:mx-0 ${textOrderClass}`}
            variants={itemVariants}
          >
            <h2 className="text-white text-3xl md:text-[40px] font-semibold leading-tight md:leading-[1.15] tracking-tight">
              {title}
            </h2>
            <div className="text-[#868f97] text-sm md:text-[15px] leading-6">
              {description}
            </div>
          </motion.div>

          <motion.div
            className={`relative mx-auto ${mockOrderClass} w-full max-w-[300px] md:max-w-[471px]`}
            variants={itemVariants}
          >
            {secondary && (
              <motion.div
                className="absolute w-[300px] h-[317px] md:w-[472px] md:h-[500px] bg-[#090909] rounded-[32px] z-0 overflow-hidden"
                style={{
                  top: reverseLayout ? "auto" : "10%",
                  bottom: reverseLayout ? "10%" : "auto",
                  left: reverseLayout ? "auto" : "-20%",
                  right: reverseLayout ? "-20%" : "auto",
                  filter: "blur(1px)",
                  opacity: 0.6,
                }}
                initial={{ y: 0 }}
                whileInView={{ y: reverseLayout ? -20 : -30 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                viewport={{ once: true, amount: 0.5 }}
              >
                {secondary}
              </motion.div>
            )}

            <motion.div
              className="relative w-full h-[405px] md:h-[560px] bg-white/[0.04] rounded-[32px] backdrop-blur-md border border-white/[0.06] z-10 overflow-hidden"
              initial={{ y: 0 }}
              whileInView={{ y: reverseLayout ? 20 : 30 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              viewport={{ once: true, amount: 0.5 }}
            >
              {primary}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div
        className="absolute w-full h-px bottom-0 left-0 z-0"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </section>
  );
}
