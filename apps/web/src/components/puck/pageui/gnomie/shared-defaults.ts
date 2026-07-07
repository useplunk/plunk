import {cloneAvatars, cloneTestimonials} from '../front-centre/shared-defaults';

import type {ExampleCarouselItem, ExampleCarouselSocial} from '../../../pageui/landing';

export function cloneGnomieAvatars() {
  return cloneAvatars();
}

export function cloneGnomieExampleCarouselItemsMadeWith(): ExampleCarouselItem[] {
  return [
    {imageSrc: 'https://picsum.photos/id/206/800/800', name: 'Amy Lawrence', location: 'Atlanta, GA', socials: ['instagram', 'facebook']},
    {imageSrc: 'https://picsum.photos/id/33/800/800', name: 'Jane Doe', location: 'Los Angeles, CA', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/59/800/800', name: 'Alice Doe', location: 'Chicago, IL', socials: ['instagram', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/71/800/800', name: 'Alex Woltman', location: 'San Francisco, CA', socials: ['facebook']},
    {imageSrc: 'https://picsum.photos/id/89/800/800', name: 'John Smith', location: 'Seattle, WA', socials: ['instagram', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/95/800/800', name: 'Jane Smith', location: 'Portland, OR', socials: ['facebook']},
    {imageSrc: 'https://picsum.photos/id/98/800/800', name: 'Alice Smith', location: 'Denver, CO', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/106/800/800', name: 'Alex Doe', location: 'Austin, TX', socials: ['instagram']},
    {imageSrc: 'https://picsum.photos/id/110/800/800', name: 'John Woltman', location: 'Houston, TX', socials: ['facebook', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/112/800/800', name: 'Brian King', location: 'Miami, FL', socials: ['instagram', 'facebook', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/253/800/800', name: 'Chris Johnson', location: 'Boston, MA', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/701/800/800', name: 'Sarah Miller', location: 'Philadelphia, PA', socials: ['instagram', 'facebook']},
    {imageSrc: 'https://picsum.photos/id/15/800/800', name: 'John Doe', location: 'New York, NY', socials: ['instagram', 'facebook']},
  ].map(item => ({
    ...item,
    socials: [...item.socials] as ExampleCarouselSocial[],
  }));
}

export function cloneGnomieExampleCarouselItemsTransform(): ExampleCarouselItem[] {
  return [
    {imageSrc: 'https://picsum.photos/id/15/800/800', name: 'Michael Thompson', location: 'Phoenix, AZ', socials: ['facebook', 'instagram']},
    {imageSrc: 'https://picsum.photos/id/701/800/800', name: 'Sophia Turner', location: 'Orlando, FL', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/253/800/800', name: 'Oliver Smith', location: 'Nashville, TN', socials: ['instagram', 'facebook']},
    {imageSrc: 'https://picsum.photos/id/112/800/800', name: 'Emily Davis', location: 'Dallas, TX', socials: ['linkedin', 'instagram']},
    {imageSrc: 'https://picsum.photos/id/110/800/800', name: 'Liam Johnson', location: 'Charlotte, NC', socials: ['facebook']},
    {imageSrc: 'https://picsum.photos/id/106/800/800', name: 'Isabella Martinez', location: 'San Diego, CA', socials: ['instagram']},
    {imageSrc: 'https://picsum.photos/id/98/800/800', name: 'Noah Brown', location: 'Columbus, OH', socials: ['facebook', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/89/800/800', name: 'Ava Wilson', location: 'Las Vegas, NV', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/71/800/800', name: 'Lucas Garcia', location: 'Baltimore, MD', socials: ['instagram']},
    {imageSrc: 'https://picsum.photos/id/59/800/800', name: 'Mia Rodriguez', location: 'Kansas City, MO', socials: ['facebook', 'linkedin']},
    {imageSrc: 'https://picsum.photos/id/33/800/800', name: 'Ethan Lee', location: 'Indianapolis, IN', socials: ['linkedin']},
    {imageSrc: 'https://picsum.photos/id/206/800/800', name: 'Charlotte White', location: 'Louisville, KY', socials: ['instagram', 'facebook']},
  ].map(item => ({
    ...item,
    socials: [...item.socials] as ExampleCarouselSocial[],
  }));
}

export function cloneGnomieProductTourItemsDesigns() {
  return [
    {
      id: 'feature-1',
      title: 'Automatic plant suggestions',
      description:
        'Make your garden redesigns easier to execute while ensuring all plants thrive in your environment.',
      videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    },
    {
      id: 'feature-2',
      title: 'Region-specific recommendations',
      description:
        'Gnomie automatically recommends plants and features that are perfect for your local climate.',
      videoSrc: 'https://cache.shipixen.com/features/21-run-locally.mp4',
    },
    {
      id: 'feature-3',
      title: 'Manual customization',
      description: 'You can also manually include/exclude specific plants and features.',
      videoSrc: 'https://cache.shipixen.com/features/22-landing-page-components.mp4',
    },
    {
      id: 'feature-4',
      title: 'Easy editing',
      description:
        'Simply drag and drop elements onto your garden design. All the heavy lifting is done automatically, requiring no manual work.',
      videoSrc: 'https://cache.shipixen.com/features/20-mobile-optimized.mp4',
    },
  ].map(item => ({...item}));
}

export function cloneGnomieProductTourItemsSavings() {
  return [
    {
      id: 'feature-1',
      title: 'Capture photos and get recommendations',
      description:
        'Gnomie makes it easy to create comprehensive garden redesigns, whether for personal use or professional landscaping.',
      videoSrc: 'https://cache.shipixen.com/features/20-mobile-optimized.mp4',
    },
    {
      id: 'feature-2',
      title: 'Generate a garden plan',
      description: 'Generate a detailed plan for your garden and export it as a PDF.',
      videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    },
    {
      id: 'feature-3',
      title: 'Ongoing Consultation and Adjustments',
      description: 'Make unlimited adjustments to your garden with a click of a button.',
      videoSrc: 'https://cache.shipixen.com/features/21-run-locally.mp4',
    },
    {
      id: 'feature-4',
      title: 'Guided Assistance',
      description:
        "Not sure where to start? Gnomie's AI chat guides you step by step, from selecting the right plants to planning the layout.",
      videoSrc: 'https://cache.shipixen.com/features/22-landing-page-components.mp4',
    },
    {
      id: 'feature-5',
      title: 'Personalized Recommendations',
      description:
        'The AI learns from your inputs, offering suggestions that match your taste, whether you prefer a lush, vibrant space or a minimalist, low-maintenance garden.',
      videoSrc: 'https://cache.shipixen.com/features/5-powerful-blog.mp4',
    },
  ].map(item => ({...item}));
}

export function cloneGnomieVideoFeatures() {
  return [
    {
      title: 'Desert Oasis in Phoenix, Arizona',
      description:
        'Before: A barren, rocky yard with minimal shade and sparse vegetation. After: A serene desert garden with drought-resistant plants that thrive in the intense Arizona heat.',
      videoSrc: 'https://cache.shipixen.com/features/21-run-locally.mp4',
    },
    {
      title: 'Cottage Garden in the English Countryside',
      description:
        'Before: An overgrown, unstructured garden with random patches of grass and weeds. After: A picturesque cottage garden bursting with color and charm, inspired by classic English gardens.',
      videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    },
    {
      title: 'Tropical Paradise in Miami, Florida',
      description:
        "Before: A plain, grassy lawn with little shade and no defined garden areas. After: A vibrant tropical paradise filled with lush, exotic plants that thrive in Miami's humid climate.",
      videoSrc: 'https://cache.shipixen.com/features/2-generate-content-with-ai.mp4',
    },
    {
      title: 'Coastal Retreat in Santa Monica, California',
      description:
        "Before: A dry, sandy yard with sparse, struggling plants. After: A stylish, drought-tolerant coastal garden that thrives in Santa Monica's Mediterranean climate.",
      videoSrc: 'https://cache.shipixen.com/features/3-theme-and-logo.mp4',
    },
  ].map(item => ({...item}));
}

export function cloneGnomieTestimonials() {
  return [
    {
      name: 'Emily Green',
      text: 'Gnomie transformed my backyard into a lush oasis. I can’t believe how easy it was!',
      handle: '@emilyplants',
      imageSrc: 'https://picsum.photos/100/100.webp?random=7',
      featured: false,
    },
    {
      name: 'Michael Bloom',
      text: 'With Gnomie’s advice, my garden is thriving like never before.',
      handle: '@bloomingmichael',
      imageSrc: 'https://picsum.photos/100/100.webp?random=8',
      featured: false,
    },
    {
      name: 'Sarah Ivy',
      text: 'This app is a gardener’s dream come true. My flowers have never looked better!',
      handle: '@sarahlovesplants',
      imageSrc: 'https://picsum.photos/100/100.webp?random=9',
      featured: true,
    },
    {
      name: 'Jake Stone',
      text: 'I was a complete beginner, but Gnomie made it easy to start my first vegetable garden.',
      handle: '@jakestone',
      imageSrc: 'https://picsum.photos/100/100.webp?random=10',
      featured: false,
    },
    {
      name: 'Lily Forrest',
      text: 'Highly recommend for anyone looking to enhance their outdoor space!',
      handle: '@lilyforrest',
      imageSrc: 'https://picsum.photos/100/100.webp?random=11',
      featured: false,
    },
    {
      name: 'Chris Fields',
      text: 'Thanks to Gnomie, my yard is now the envy of the neighborhood.',
      handle: '@chrisfields',
      imageSrc: 'https://picsum.photos/100/100.webp?random=12',
      featured: false,
    },
  ].map(item => ({...item}));
}

export function cloneGnomiePricingFrequencies() {
  return [
    {id: '1', value: '1', label: 'Monthly', priceSuffix: '/month'},
    {id: '2', value: '2', label: 'Annually', priceSuffix: '/year'},
  ].map(item => ({...item}));
}

export function cloneGnomiePricingTiers() {
  return [
    {
      name: 'Casual',
      id: '0',
      href: '#',
      price: {'1': '$25', '2': '$250'},
      discountPrice: {'1': '', '2': ''},
      description: 'Use up to 5 photos per months and generate 60 garden variations',
      features: ['One-time payment', '5 photos', '60 garden variations', 'Object removal'],
      featured: false,
      highlighted: false,
      soldOut: false,
      cta: 'Get started',
    },
    {
      name: 'Enthusiast',
      id: '1',
      href: '#',
      price: {'1': '$39', '2': '$399'},
      discountPrice: {'1': '', '2': ''},
      description: 'Use up to 10 photos per months and generate 200 garden variations',
      features: [
        'One-time payment',
        '10 photos',
        '200 garden variations',
        'Object removal',
        'Decluttering',
        'Enhanced quality',
      ],
      featured: false,
      highlighted: true,
      soldOut: false,
      cta: 'Get started',
    },
  ].map(tier => ({
    ...tier,
    price: {...tier.price},
    discountPrice: {...tier.discountPrice},
    features: [...tier.features],
  }));
}

export function cloneGnomieFaqItems() {
  return [
    {
      question: 'How does Gnomie work?',
      answer:
        'Gnomie uses AI to analyze photos of your garden and provides customized recommendations for plants, flowers, and landscaping that suit your region and preferences.',
    },
    {
      question: 'Is Gnomie suitable for beginners?',
      answer:
        'Absolutely! Whether you’re new to gardening or have some experience, Gnomie offers tools and suggestions that make it easy to enhance your garden.',
    },
    {
      question: 'Can I use Gnomie for large gardens?',
      answer:
        'Yes, Gnomie can handle garden designs for any size, from small balconies to large yards. Just provide photos of your space, and we’ll help you design it.',
    },
    {
      question: 'What types of plants does Gnomie recommend?',
      answer:
        'Gnomie recommends plants that thrive in your specific region and climate. Our AI ensures that the suggestions are tailored to your local environment.',
    },
    {
      question: 'How often should I update my garden design?',
      answer:
        'It’s a good idea to revisit your garden design seasonally to incorporate new plants or landscaping ideas. Gnomie can help you make updates easily.',
    },
    {
      question: 'Do I need to pay for the full version?',
      answer:
        'Gnomie offers both free and paid plans. The free plan provides basic features, while the paid plans offer more advanced features and personalized recommendations.',
    },
    {
      question: 'Can I try Gnomie before purchasing?',
      answer:
        'Yes, we offer a free trial so you can explore Gnomie’s features and see how it works for your garden before committing to a paid plan.',
    },
    {
      question: 'Is my data secure with Gnomie?',
      answer:
        'Absolutely. We take your privacy seriously and ensure that all your data is encrypted and securely stored. Your garden photos and designs are safe with us.',
    },
    {
      question: 'How do I contact customer support?',
      answer:
        'You can reach our customer support team via email, live chat on our website, or through our social media channels. We’re here to help with any questions or issues.',
    },
    {
      question: 'What if I’m not satisfied with Gnomie?',
      answer:
        'If you’re not satisfied with Gnomie, we offer a satisfaction guarantee. You can contact our support team for assistance or to discuss any concerns you might have.',
    },
  ].map(item => ({...item}));
}

export {cloneTestimonials};
