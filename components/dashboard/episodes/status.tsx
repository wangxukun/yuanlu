import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function EpisodeStatus({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-1 text-xs",
        {
          "bg-slate-100 text-slate-500": status === "pending",
          "bg-green-500 text-white": status === "paid",
        },
      )}
    >
      {status === "pending" ? (
        <>
          待发布
          <ClockIcon className="ml-1 w-4 text-gray-500" />
        </>
      ) : null}
      {status === "paid" ? (
        <>
          已发布
          <CheckIcon className="ml-1 w-4 text-white" />
        </>
      ) : null}
    </span>
  );
}
