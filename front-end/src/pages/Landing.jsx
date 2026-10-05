import { m, useReducedMotion } from "motion/react";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
export default function Landing({ navigate }) {
  const reduce = useReducedMotion();
  return (
    <>
      <section className="landing-hero">
        <m.div
          className="hero-copy"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="eyebrow">
            <span className="tiny-line" /> A HOME FOR YOUR NEXT LOOK
          </p>
          <h1>
            Your workspace.
            <br />
            <em>Your kind of world.</em>
          </h1>
          <p className="hero-intro">
            A community for the little details that make a workspace feel like
            yours. Find a theme you love. Share one you made. Make someone’s
            day.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => navigate("community")}
            >
              Find your next theme <Icon name="ArrowRight" />
            </button>
            <a className="text-link" href="#/upload">
              Share something you made ↗
            </a>
          </div>
          <div className="hero-note">
            <div
              className="avatar-stack"
              aria-label="Interactive Blobatar preview"
            >
              {[1, 8, 12, 20].map((avatar) => (
                <Avatar
                  key={avatar}
                  user={{ avatar, name: "Blobatar" }}
                  size={38}
                />
              ))}
            </div>
            <p>
              A little personality goes a long way.
              <br />
              <span>Say hello to a face.</span>
            </p>
          </div>
        </m.div>
        <m.div
          className="workspace-illustration"
          aria-label="Illustrated Codex workspace"
          initial={reduce ? false : { opacity: 0, rotate: 2 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="illustration-caption">
            A SPACE TO MAKE SOMETHING GOOD <span>01 / YOURS</span>
          </div>
          <div className="workspace-art">
            <div className="art-sun" />
            <div className="art-hill hill-one" />
            <div className="art-hill hill-two" />
            <div className="art-hill hill-three" />
            <div className="window-example">
              <div className="window-bar">
                <i />
                <i />
                <i />
                <span>your next idea</span>
              </div>
              <div className="window-body">
                <aside>
                  ✦<span />
                  <span />
                  <span />
                </aside>
                <div>
                  <small>LET’S MAKE IT HAPPEN</small>
                  <h2>
                    Room for a<br />
                    different perspective.
                  </h2>
                  <p>
                    Start with a small idea.
                    <br />
                    See where it takes you.
                  </p>
                  <div className="example-composer">
                    What are we building today?<span>↑</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="art-caption">The possibilities are personal.</div>
          </div>
        </m.div>
      </section>
      <section className="landing-principles">
        <div>
          <p className="eyebrow">NOT JUST A BACKGROUND</p>
          <h2>
            A shared space.
            <br />A personal touch.
          </h2>
        </div>
        <article>
          <span>01</span>
          <h3>Find your atmosphere</h3>
          <p>
            Explore workspaces made by the community, with honest reactions and
            conversations under every theme.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Give your ideas a home</h3>
          <p>
            Upload your own package, credit the artwork, and let people bring
            your perspective to their workspace.
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>Show up as yourself</h3>
          <p>
            Pick a Blobatar, make it yours, and join a community with a little
            more character.
          </p>
        </article>
      </section>
      <section className="landing-invitation">
        <p className="eyebrow">THE COLLECTION STARTS WITH YOU</p>
        <h2>Made something worth sharing?</h2>
        <p>Your theme could be someone else’s favorite place to work.</p>
        <a className="button primary" href="#/upload">
          Share your first theme <Icon name="Upload" />
        </a>
      </section>
    </>
  );
}
