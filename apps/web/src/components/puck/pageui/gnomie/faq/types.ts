export interface GnomieFaqItem {
  question: string;
  answer: string;
}

export interface GnomieFaqProps {
  title: string;
  description: string;
  withBackground: boolean;
  faqItems: GnomieFaqItem[];
  sectionId: string;
}
