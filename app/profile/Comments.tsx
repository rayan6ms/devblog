import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import slugify from 'slugify';

type Comment = {
  content: string;
  postTitle: string;
  postImage: string;
  postedAt: string;
  edited: boolean;
  editedAt: string;
};

type CommentsProps = {
  comments: Comment[];
};

const CommentItem = ({ comment }: { comment: Comment }) => (
  <Link
    href={`/post/${slugify(comment.postTitle, { lower: true, strict: true })}`}
    className="group w-64 mb-2 mx-2 flex flex-col justify-between items-start p-2 bg-lessDarkBg rounded-xl shadow-md"
  >
    <div className="flex select-none w-64 h-22 mb-3">
      <Image src='https://oxentesensei.com.br/wp-content/uploads/2022/01/Rocket-Raccoon-capa.jpg' width={40} height={40} alt="User" className="rounded-full w-[28px] h-[28px] mr-2 object-cover" />
      <p
        className="line-clamp-6 text-sm text-zinc-200"
        title={comment.content}
      >
        {comment.content}
      </p>
    </div>
    <div className="w-full flex items-center justify-between px-2">
      <p
        className="line-clamp-2 text-xs text-zinc-400"
        title={comment.postTitle}
      >
        {comment.postTitle}
      </p>
      <Image src={comment.postImage} width={32} height={32} alt={comment.postTitle} className="rounded-md w-[52px] h-full object-cover" />
    </div>
  </Link>
);

export default function Comments({ comments }: CommentsProps) {
  return (
    <div className="bg-darkBg p-5 rounded-lg shadow-md m-2 md:m-5">
      <div className="flex items-center gap-2 mb-2 text-wheat">
        <h3 className="font-europa text-xl">Comments</h3>
        <FontAwesomeIcon icon={faComment} />
      </div>
      <div className="flex overflow-x-auto px-2 md:px-0">
        {comments.map((comment, index) => (
          <CommentItem key={index} comment={comment} />
        ))}
      </div>
    </div>
  );
};
