import dbConnect from "@/database/dbConnect";
import Post from "@/../models/Post";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  await dbConnect();
  const post = await Post.findOne({ slug: params.slug, status: "published" })
    .populate("author", "username slug profilePic role")
    .lean();
  if (!post) return new Response("Not found", { status: 404 });
  return Response.json(post);
}