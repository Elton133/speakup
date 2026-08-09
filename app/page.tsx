"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { BrandLogo } from "./components/brand-logo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Comment01Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";

const Arrow = () => (
  <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
);
const Reveal = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 34 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.18 }}
    transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);
const StatIcon = ({
  icon,
  children,
}: {
  icon: typeof FavouriteIcon;
  children: React.ReactNode;
}) => (
  <span>
    <HugeiconsIcon icon={icon} size={15} strokeWidth={1.7} aria-hidden="true" />
    {children}
  </span>
);

function Logo({ footer = false }: { footer?: boolean }) {
  return (
    <a className={`logo ${footer ? "logo--footer" : ""}`} href="#top" aria-label="SpeakUp home">
      <BrandLogo inverse={footer} />
    </a>
  );
}

export default function Home() {
  const artRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || !artRef.current) return;
    const context = gsap.context(() => {
      gsap.to(".hero__mark-wrap", {
        y: -13,
        rotate: -1,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orbit--one", { rotate: 360, duration: 32, repeat: -1, ease: "none" });
      gsap.to(".orbit--two", { rotate: -360, duration: 24, repeat: -1, ease: "none" });
    }, artRef);
    return () => context.revert();
  }, [reduceMotion]);

  return (
    <main id="top">
      <header className="site-header shell">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#why">Why SpeakUp</a>
          <a href="/community">Community</a>
          <a href="#values">Our values</a>
        </nav>
        <a className="button button--small" href="/community">
          Enter the community <Arrow />
        </a>
      </header>

      <section className="hero shell">
        <div className="hero__copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65 }}
          >
            <span /> A place for truth seekers
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            Truth was never
            <br />
            meant to be <em>hidden.</em>
          </motion.h1>
          <motion.p
            className="hero__lede"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
          >
            A thoughtful Christian community for sharing what you&apos;re learning, questioning what
            you&apos;ve been told, and carrying the light beyond the church walls.
          </motion.p>
          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <a className="button" href="#join">
              Speak your truth <Arrow />
            </a>
            <a className="text-link" href="#discover">
              Explore the conversation{" "}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </a>
          </motion.div>
        </div>

        <motion.div
          ref={artRef}
          className="hero__art"
          aria-label="A hand lifting a lantern into the light"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="orbit orbit--one" />
          <span className="orbit orbit--two" />
          <span className="hero__mark-wrap">
            <img className="hero__mark" src="/assets/brand/hand-lantern-mark.png" alt="" />
          </span>
          <span className="light-ray" />
        </motion.div>
        <div className="scroll-note">
          KEEP SCROLLING{" "}
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} aria-hidden="true" />
        </div>
      </section>

      <section className="carry-light">
        <div
          className="carry-light__image"
          role="img"
          aria-label="A hand firmly carrying a glowing lantern through darkness"
        />
        <motion.div
          className="carry-light__copy"
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">YOUR LIGHT / YOUR RESPONSIBILITY</p>
          <h2>
            Own your light.
            <br />
            <em>Carry it.</em>
          </h2>
          <p>
            You don&apos;t light a lamp to hide it under a bushel. Truth asks something of us: get
            up, take hold, and bring the light where darkness expects us to stay quiet.
          </p>
          <a className="button button--light" href="/community">
            Bring something to light <Arrow />
          </a>
        </motion.div>
      </section>

      <section className="manifesto" id="why">
        <div className="shell manifesto__grid">
          <p className="section-label">01 / OUR CALLING</p>
          <Reveal>
            <blockquote>
              “You are the light of the world. A city set on a hill cannot be hidden.”
            </blockquote>
            <p className="verse">MATTHEW 5:14</p>
          </Reveal>
          <Reveal className="manifesto__copy" delay={0.12}>
            <p>
              We believe faith grows stronger when honest questions have room to breathe. SpeakUp is
              a place to dig beneath the surface, remove the smokescreens, and share what brings
              truth to light.
            </p>
            <p>Because the work doesn&apos;t end at the church door.</p>
          </Reveal>
        </div>
      </section>

      <section className="feed-section shell" id="discover">
        <div className="section-heading">
          <Reveal>
            <p className="section-label">02 / IN THE LIGHT</p>
            <h2>
              Thoughts worth
              <br />
              bringing to light.
            </h2>
          </Reveal>
          <p>
            Scripture, ideas, questions, and convictions from people choosing to think deeply and
            speak honestly.
          </p>
        </div>

        <div className="post-grid">
          <motion.article
            className="post post--dark"
            initial={{ opacity: 0, y: 42 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.75 }}
            whileHover={{ y: -6 }}
          >
            <div className="post__meta">
              <span className="avatar">AM</span>
              <p>
                <b>Amara M.</b>
                <small>REFLECTION · 4 MIN READ</small>
              </p>
              <HugeiconsIcon icon={MoreHorizontalIcon} size={18} aria-label="More options" />
            </div>
            <p className="post__quote">
              “Light doesn&apos;t argue with darkness. It simply shows up.”
            </p>
            <p className="post__body">
              What if our greatest witness isn&apos;t winning the argument, but living so truthfully
              that the contrast becomes undeniable?
            </p>
            <div className="post__stats">
              <StatIcon icon={FavouriteIcon}>248</StatIcon>
              <StatIcon icon={Comment01Icon}>32</StatIcon>
              <StatIcon icon={Share08Icon}>Share</StatIcon>
            </div>
          </motion.article>

          <motion.article
            className="post post--paper"
            initial={{ opacity: 0, x: 34 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, delay: 0.08 }}
            whileHover={{ x: -5 }}
          >
            <div className="post__tag">FROM THE WORD</div>
            <p className="post__scripture">
              “For nothing is hidden that will not be made manifest, nor is anything secret that
              will not be known and come to light.”
            </p>
            <p className="verse">LUKE 8:17</p>
            <div className="post__stats">
              <StatIcon icon={FavouriteIcon}>419</StatIcon>
              <StatIcon icon={Comment01Icon}>51</StatIcon>
              <StatIcon icon={Share08Icon}>Share</StatIcon>
            </div>
          </motion.article>

          <motion.article
            className="post post--outline"
            initial={{ opacity: 0, x: 34 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, delay: 0.16 }}
            whileHover={{ x: -5 }}
          >
            <div className="post__meta">
              <span className="avatar avatar--light">JK</span>
              <p>
                <b>Joel K.</b>
                <small>QUESTION</small>
              </p>
              <HugeiconsIcon icon={MoreHorizontalIcon} size={18} aria-label="More options" />
            </div>
            <h3>What structures can we build beyond Sunday?</h3>
            <p className="post__body">
              The world disciples people seven days a week. What would it look like for us to build
              systems that do the same—at work, online, and in our neighbourhoods?
            </p>
            <div className="topic-row">
              <span>#BEYONDWALLS</span>
              <span>#CULTURE</span>
            </div>
            <div className="post__stats">
              <StatIcon icon={FavouriteIcon}>183</StatIcon>
              <StatIcon icon={Comment01Icon}>67</StatIcon>
              <StatIcon icon={Share08Icon}>Share</StatIcon>
            </div>
          </motion.article>
        </div>
      </section>

      <section className="values" id="values">
        <div className="shell">
          <div className="section-heading section-heading--light">
            <Reveal>
              <p className="section-label">03 / WHAT GUIDES US</p>
              <h2>
                Built for depth,
                <br />
                not noise.
              </h2>
            </Reveal>
            <p>
              SpeakUp is designed around the kind of conversation that forms people—not just feeds
              an algorithm.
            </p>
          </div>
          <div className="value-grid">
            {[
              [
                "01",
                "Scripture-rooted",
                "The Bible is our foundation. Ideas are explored with curiosity, but truth has an anchor.",
              ],
              [
                "02",
                "Honest, not polished",
                "Share what you're learning while you're learning it. No platform, title, or perfect answer required.",
              ],
              [
                "03",
                "Beyond the walls",
                "Turn conviction into action. Find people and practical ways to carry light into every sphere of life.",
              ],
            ].map(([n, title, copy], i) => (
              <motion.article
                key={n}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.65, delay: i * 0.11 }}
              >
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="join shell" id="join">
        <p className="section-label">THE CONVERSATION IS OPEN</p>
        <motion.h2
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          There&apos;s more to say.
          <br />
          <em>Speak up.</em>
        </motion.h2>
        <p>
          Join people who are hungry for truth, ready for honest conversation, and committed to
          bringing light where it&apos;s needed most.
        </p>
        <a className="button" href="/community">
          Join the conversation <Arrow />
        </a>
      </section>

      <footer>
        <div className="shell footer__top">
          <Logo footer />
          <p>
            Truth, unscripted.
            <br />
            Light, unhindered.
          </p>
          <div>
            <a href="#why">About</a>
            <a href="#discover">Discover</a>
            <a href="/community">Community</a>
          </div>
        </div>
        <div className="shell footer__bottom">
          <span>© 2026 SPEAKUP</span>
          <span>BUILT TO CARRY THE LIGHT</span>
        </div>
      </footer>
    </main>
  );
}
