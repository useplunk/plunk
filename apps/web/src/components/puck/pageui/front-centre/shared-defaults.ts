export function pageUiGrayPlaceholder(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e5e5e5"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PAGEUI_PLACEHOLDER_800x600 = pageUiGrayPlaceholder(800, 600);
export const PAGEUI_PLACEHOLDER_1000x800 = pageUiGrayPlaceholder(1000, 800);
export const PAGEUI_PLACEHOLDER_1200x600 = pageUiGrayPlaceholder(1200, 600);

export const DEFAULT_AVATARS = [
  {imageSrc: 'https://picsum.photos/id/64/100/100', name: 'John Doe'},
  {imageSrc: 'https://picsum.photos/id/65/100/100', name: 'Jane Doe'},
  {imageSrc: 'https://picsum.photos/id/669/100/100', name: 'Alice Doe'},
] as const;

export function cloneAvatars() {
  return DEFAULT_AVATARS.map(a => ({...a}));
}

export function cloneKeyPoints() {
  return [
    {
      title: 'Engaging Tutorials',
      description:
        'Learn at your own pace with our easy-to-follow tutorials, designed for beginners and seasoned developers alike.',
    },
    {
      title: 'Live Coding Sessions',
      description:
        'Participate in live coding sessions led by experienced instructors, gaining insights and tips in real-time.',
    },
    {
      title: 'Interactive Quizzes',
      description:
        'Test your knowledge and reinforce learning with interactive quizzes that make studying fun and effective.',
    },
  ].map(k => ({...k}));
}

export function cloneTestimonials() {
  return [
    {
      name: 'Mathew',
      text: 'After using this, I cannot imagine going back to the old way of doing things.',
      handle: '@heymatt_oo',
      imageSrc: 'https://picsum.photos/100/100.webp?random=2',
      featured: false,
    },
    {
      name: 'Joshua',
      text: 'Perfect for my use case',
      handle: '@joshua',
      imageSrc: 'https://picsum.photos/100/100.webp?random=3',
      featured: false,
    },
    {
      name: 'Parl Coppa',
      text: 'This is the best thing since sliced bread. I cannot believe I did not think of it myself.',
      handle: '@coppalipse',
      imageSrc: 'https://picsum.photos/100/100.webp?random=1',
      featured: true,
    },
    {
      name: 'Mandy',
      text: 'Excellent product!',
      handle: '@mandy',
      imageSrc: 'https://picsum.photos/100/100.webp?random=4',
      featured: false,
    },
    {
      name: 'Alex',
      text: 'Can easily recommend!',
      handle: '@alex',
      imageSrc: 'https://picsum.photos/100/100.webp?random=5',
      featured: false,
    },
    {
      name: 'Sam',
      text: 'I am very happy with the results.',
      handle: '@sama',
      imageSrc: 'https://picsum.photos/100/100.webp?random=6',
      featured: false,
    },
  ].map(t => ({...t}));
}

export function cloneFaqItems() {
  return [
    {
      question: 'Is this suitable for beginners?',
      answer:
        'Absolutely! Our learning center caters to learners of all levels, from absolute beginners to experienced developers.',
    },
    {
      question: 'How much time do I need to invest?',
      answer:
        'You can progress at your own pace, but dedicating a few hours each week will help you see significant improvement in your skills.',
    },
    {
      question: 'Will I receive a certificate?',
      answer:
        "Yes, upon completion of certain courses or tracks, you'll receive a certificate to showcase your achievement.",
    },
  ].map(f => ({...f}));
}

export function cloneFeaturesGridItems() {
  return [
    {
      type: 'image' as const,
      title: 'Portfolio Building',
      description:
        'Craft a standout portfolio showcasing your skills and projects, setting yourself apart in the competitive job market.',
      imageSrc: PAGEUI_PLACEHOLDER_800x600,
      videoSrc: '',
      autoPlay: false,
    },
    {
      type: 'video' as const,
      title: 'Career Guidance',
      description:
        'Get expert advice on building a successful career in front-end development, from resume crafting to job interview tips.',
      imageSrc: '',
      videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
      autoPlay: false,
    },
    {
      type: 'video' as const,
      title: 'Feedback & Support',
      description:
        'Receive personalized feedback from instructors and access dedicated support to overcome challenges and keep progressing.',
      imageSrc: '',
      videoSrc: 'https://cache.shipixen.com/features/2-generate-content-with-ai.mp4',
      autoPlay: false,
    },
    {
      type: 'video' as const,
      title: 'Interactive Quizzes',
      description:
        'Test your knowledge and reinforce learning with interactive quizzes that make studying fun and effective.',
      imageSrc: '',
      videoSrc: 'https://cache.shipixen.com/features/3-theme-and-logo.mp4',
      autoPlay: false,
    },
  ].map(i => ({...i}));
}
