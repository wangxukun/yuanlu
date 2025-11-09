import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function IsExclusive({ isExclusive }: { isExclusive: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-1 text-xs",
        isExclusive ? "bg-red-100 text-red-500" : "bg-green-500 text-white",
      )}
    >
      {isExclusive ? (
        <>
          付费订阅
          <ClockIcon className="ml-1 w-4 text-gray-500" />
        </>
      ) : (
        <>
          免费
          <CheckIcon className="ml-1 w-4 text-white" />
        </>
      )}
    </span>
  );
}
