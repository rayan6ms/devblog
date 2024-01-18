import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faHandHoldingHeart, faStar, faUser, faBolt, faPenNib, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import SocialLinks from './SocialLinks';
import Image from 'next/image';
import { IUser } from '@/data/posts';

const roleStyles: Record<string, { color: string, icon: any }> = {
  member: { color: 'bg-emerald-500/90', icon: faUser },
  volunteer: { color: 'bg-blue-500/90', icon: faHandHoldingHeart },
  writer: { color: 'bg-cyan-500/90', icon: faPenNib },
  vip: { color: 'bg-pink-600/90', icon: faStar },
  admin: { color: 'bg-red-700', icon: faCrown },
  owner: { color: 'bg-indigo-600', icon: faBolt },
};

export default function Header({ user }: { user: IUser }) {
  const role = user.role.toLowerCase();
  const { color, icon } = roleStyles[role] || roleStyles['member'];

  return (
    <div
      className="h-fit pb-2 relative bg-gradient-to-r from-purpleContrast/80 to-purple-600/70 rounded-t-xl sm:rounded-t-2xl p-5 flex flex-col xxl:flex-row items-center"
    >
      <div className="flex gap-6">
        <div
          className="hidden sm:block w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-xl overflow-hidden border-2 border-zinc-300 xl:absolute -top-6 left-32 xxl:left-14"
        >
          <Image
            className="w-full h-full object-cover border border-zinc-400/70"
            src={user.profilePicture}
            width={128}
            height={128}
            alt="Profile"
          />
        </div>
        <div
          className="ml-0 xxl:ml-48 self-center md:self-auto flex flex-col  md:items-start mt-2 md:mt-0"
        >
          <div
            className="flex gap-5 sm:gap-0 items-center justify-center xs:justify-start"
          >
            <div
              className="block sm:hidden w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-xl overflow-hidden border-2 border-zinc-300 xl:absolute -top-6 left-32 xxl:left-14"
            >
              <Image
                className="w-full h-full object-cover border border-zinc-400/70"
                src={user.profilePicture}
                width={128}
                height={128}
                alt="Profile"
              />
            </div>
            <div className="flex flex-col sm:flex-row">
              <h2
                className="first-letter:uppercase font-europa text-2xl text-zinc-100 [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600 mr-3"
              >
                {user.name}
              </h2>
              <div
                className={`flex items-center w-fit ${color} text-white py-1 px-2.5 rounded-full text-sm outline -outline-offset-2 outline-zinc-300/${role === 'volunteer' || 'owner' ? '10' : '20'}`}
              >
                <FontAwesomeIcon icon={icon} className="text-xs mr-1.5" />
                <span
                  className={`mt-0.5 first-letter:uppercase ${role === 'vip' && 'uppercase'}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <p
            className="text-center xs:text-start font-roboto line-clamp-4 xs:line-clamp-3 w-[340px] xs:w-[400px] md:w-[500px] text-zinc-100 [text-shadow:_0_2px_4px_var(--tw-shadow-color)] shadow-zinc-600 mt-2"
          >
            {user.description}
          </p>
          <div
            className="self-center md:self-start xxl:absolute w-fit mt-4 xxl:right-5 xxl:top-1/2 xxl:transform xxl:-translate-y-1/2"
          >
            <SocialLinks links={user.socialLinks} />
          </div>
        </div>
      </div>
      <button
        className="border border-zinc-500/30 absolute right-6 md:right-5 top-7 md:top-4 xxl:top-2 bg-zinc-700/50 hover:bg-zinc-700/75 transition-all duration-300 rounded-md px-1.5"
      >
        <FontAwesomeIcon icon={faPenToSquare} className="text-zinc-100" />
      </button>
    </div>
  );
};