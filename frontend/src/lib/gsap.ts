import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { TextPlugin } from 'gsap/TextPlugin';
import { useGSAP } from '@gsap/react';

// Register standard plugins
gsap.registerPlugin(ScrollTrigger, Flip, TextPlugin, useGSAP);

export { gsap, ScrollTrigger, Flip, TextPlugin, useGSAP };
