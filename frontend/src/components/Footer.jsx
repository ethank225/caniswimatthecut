import { formatTimestamp } from "../lib/format.js";
import Skeleton from "./Skeleton.jsx";

export default function Footer({ updatedAt, loading }) {
  return (
    <>
      <div className="mb-3 text-[11px] leading-normal text-fg4">
        {loading ? (
          <Skeleton className="inline-block h-[1lh] w-48 align-middle" />
        ) : (
          formatTimestamp(updatedAt)
        )}
      </div>
      <div>
        <a href="#/about" className="text-[11px] text-fg3 no-underline hover:text-fg">
          about the data →
        </a>
      </div>
    </>
  );
}
