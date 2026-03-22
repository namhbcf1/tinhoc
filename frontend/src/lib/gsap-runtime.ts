const noopTimeline = {
  from: () => noopTimeline,
  fromTo: () => noopTimeline,
  to: () => noopTimeline,
  set: () => noopTimeline,
  add: () => noopTimeline,
};

export const gsap = {
  registerPlugin: () => undefined,
  timeline: () => noopTimeline,
  from: () => noopTimeline,
  fromTo: () => noopTimeline,
  to: () => noopTimeline,
  set: () => noopTimeline,
};

export const ScrollTrigger = {};
export const Flip = {};
export const TextPlugin = {};

export default gsap;
