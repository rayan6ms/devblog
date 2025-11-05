import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/route";
import dbConnect from "@/database/dbConnect";
import Comment from "@/../models/Comment";
import Post from "@/../models/Post";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { postId, text } = await req.json();
  if (!postId || !text) return new Response("Bad request", { status: 400 });

  await dbConnect();
  const comment = await Comment.create({ text, post: postId, author: session.user.id });
  await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });
  return Response.json({ id: comment._id });
}