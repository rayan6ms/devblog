import PostHeader from './PostHeader';
import PostBody from './PostBody';
import PostFooter from './PostFooter';
import CommentSection from './CommentSection';
import Footer from '@/components/Footer';
import PostEditButton from './PostEditButton';

export default function page({ params }: any ) {
  const postId = params.id;
  const tags = ["heróis", "vilões", "anti-heróis"];
  const mainTag = "heróis";

  return (
    <>
      <main className="relative bg-darkBg -trocar-cor shadow-lg shadow-zinc-900 rounded-xl w-full md:w-5/6 xl:w-2/3 xxl:w-2/4 mt-6 mx-auto mb-10 py-10 px-7 lg:px-14">
        <PostHeader tags={tags} />
        <PostBody />
        <PostFooter />
        <PostEditButton slug={postId} authorName="Johann Gottfried" />
        <CommentSection />
      </main>
      <Footer />
    </>
  )
}
