'use client'


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faFlag } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import slugify from 'slugify';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommentProps {
  id: number;
  author: string;
  date: string;
  commentText: string;
  upvotes: number;
  downvotes: number;
  avatar: string;
  votes: Record<number, number>;
  userVotes: Record<number, 'up' | 'down' | null>;
  onVote: (id: number, action: 'up' | 'down') => void;
}

export default function Comment({ id, author, date, commentText, avatar, votes, userVotes, onVote }: CommentProps) {
  const formattedDate = (date: string) => format(parseISO(date), 'dd MMM yyyy', { locale: ptBR }).replace(/ (\w)/, (_match, p1) => ` ${p1.toUpperCase()}`);
  
  const fullFormattedDate = (date: string) => format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: ptBR });

  function formattedAuthor(author: string) {
    let result = author.length > 20 ? `${author.slice(0, 20)}...` : author;
    return result.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);  

  return (
    <div className="flex mt-7 items-start">
      <div className="flex flex-col mr-3">
        <Link
          href={`/profile/${slugify(author, { lower: true, strict: true })}`}
        >
          <img
            className="w-10 h-10 object-cover rounded-full"
            src={avatar}
            alt={`Avatar de ${author}`}
            title={`Avatar de ${author}`}
          />
        </Link>
        <div className="flex flex-col items-center mt-2">
          <button
            onClick={() => onVote(id, 'up')}
            className={`text-gray-300 ${userVotes[id] === 'up' && 'text-purpleContrast'} hover:text-purpleContrast transition-all`}
            >
            <FontAwesomeIcon icon={faChevronUp} />
          </button>
          <span>{votes[id]}</span>
          <button
            onClick={() => onVote(id, 'down')}
            className={`text-gray-300 ${userVotes[id] === 'down' && 'text-purpleContrast'} hover:text-purpleContrast transition-all`}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
        </div>
      </div>
      <div className="flex flex-col w-full h-full px-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <Link
              href={`/profile/${slugify(author, { lower: true, strict: true })}`}
              rel="author"
              className="text-gray-100 font-bold text-lg hover:text-purpleContrast transition-all ease-in-out"
            >
              {formattedAuthor(author)}
            </Link>
            <p className="flex gap-1 font-europa text-zinc-300 text-sm">
              <span title={capitalize(fullFormattedDate(date))}>
                Postado <time dateTime={date}>{formattedDate(date)}</time>
              </span>
            </p>
          </div>
          <button className="hover:text-purpleContrast transition-all ease-in-out">
            <FontAwesomeIcon icon={faFlag} />
          </button>
        </div>
        <p className="text-zinc-400">{commentText}</p>
      </div>
    </div>
  );
}
