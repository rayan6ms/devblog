import { getServerSession } from "next-auth";
import { authConfig } from "../auth/[...nextauth]/route";
import dbConnect from "@/database/dbConnect";
import Post from "@/../models/Post";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  await dbConnect();
  const body = await req.json();
  // TODO: validate with zod
  const post = await Post.create({
    title: body.title,
    content: body.content,
    author: session.user.id,
    mainTag: body.mainTag,
    tags: body.tags || [],
    description: body.description,
    status: "draft",
  });
  return Response.json({ id: post._id, slug: post.slug });
}