// Animation configurations for navbar components
export const ANIMATION_CONFIG = {
  // Container expansion animation
  container: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.2, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  
  // Backdrop animation
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 0.5 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 }
  },
  
  // Content fade-in
  content: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.2, delay: 0.05 }
  },
  
  // Competition items drop-in
  item: {
    initial: { opacity: 0, y: -15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { 
      duration: 0.25, 
      ease: [0.25, 1.0, 0.5, 1.0]
    }
  },
  
  // Section stagger variants
  sectionStagger: {
    initial: {},
    animate: {
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    },
    exit: {}
  },
  
  // Item stagger variants
  itemStagger: {
    initial: {},
    animate: {
      transition: {
        delayChildren: 0.05,
        staggerChildren: 0.03
      }
    },
    exit: {}
  }
};
