import dynamic from 'next/dynamic';
import {IconSpinner} from '@plunk/ui';
import {NextSeo} from 'next-seo';
import {useRouter} from 'next/router';

const LandingPagePuckEditor = dynamic(() => import('../../../components/LandingPagePuckEditor'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-100">
      <IconSpinner />
    </div>
  ),
});

export default function LandingPageEditPage() {
  const router = useRouter();
  const {id} = router.query;

  if (!router.isReady || typeof id !== 'string') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-100">
        <IconSpinner />
      </div>
    );
  }

  return (
    <>
      <NextSeo title="Edit Landing Page" />
      <LandingPagePuckEditor landingPageId={id} />
    </>
  );
}
