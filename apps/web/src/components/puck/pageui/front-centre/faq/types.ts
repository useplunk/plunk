export interface FaqItem {
  question: string;
  answer: string;
}

export interface PageUiFaqProps {
  title: string;
  description: string;
  faqItems: FaqItem[];
  withBackground: boolean;
  sectionId: string;
}
