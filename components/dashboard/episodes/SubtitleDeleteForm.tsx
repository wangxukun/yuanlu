// "use client";
//
// import React from "react";
// import { useActionState } from "react";
// import { deleteEnSubtitle, deleteZhSubtitle } from "@/lib/actions";
// import { SubtitleManagementState } from "@/lib/types";
//
// interface Props {
//   episodeId: string;
//   fileName: string;
//   language: "en" | "zh";
// }
//
// export function SubtitleDeleteForm({ episodeId, fileName, language }: Props) {
//   const initialState: SubtitleManagementState = {
//     success: false,
//     message: "",
//   };
//
//   const [state, action, isPending] = useActionState<
//     SubtitleManagementState,
//     FormData
//   >(language === "en" ? deleteEnSubtitle : deleteZhSubtitle, initialState);
//
//   return (
//     <>
//       <form action={action}>
//         <input type="hidden" name="episodeId" value={episodeId} />
//         <input type="hidden" name="fileName" value={fileName} />
//         <button type="submit" className="btn btn-error" disabled={isPending}>
//           {isPending ? "删除中..." : "删除"}
//         </button>
//       </form>
//       {state.message && <p>{state.message}</p>}
//     </>
//   );
// }
