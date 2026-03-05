import Footer from "@/components/Footer";
import CommentSection from "./CommentSection";
import PostBody from "./PostBody";
import PostEditButton from "./PostEditButton";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";

type PostPageProps = PageProps<"/post/[slug]">;

export default async function Page({ params }: PostPageProps) {
	const { slug: postId } = await params;
	const tags = ["heróis", "vilões", "anti-heróis"];
	const mainTag = "heróis";
	const markdown = `# ${mainTag}\n\nThis post page is still using placeholder content.`;

	return (
		<>
			<main className="relative bg-darkBg -trocar-cor shadow-lg shadow-zinc-900 rounded-xl w-full md:w-5/6 xl:w-2/3 xxl:w-2/4 mt-6 mx-auto mb-10 py-10 px-7 lg:px-14">
				<PostHeader tags={tags} />
				<PostBody markdown={markdown} />
				<PostFooter />
				<PostEditButton slug={postId} authorName="Johann Gottfried" />
				<CommentSection />
			</main>
			<Footer />
		</>
	);
}
