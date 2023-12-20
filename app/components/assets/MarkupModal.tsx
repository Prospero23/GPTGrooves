"use client";

import { type Dispatch, type SetStateAction } from "react";

interface MarkupType {
  original_text: string;
  sections: any;
}

export default function AboutModal({
  markup,
  setShowModal,
}: {
  markup: MarkupType;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <>
        <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
          <div className="relative w-auto my-6 mx-auto max-w-3xl">
            {/* content */}
            <div className="rounded-lg shadow-lg relative flex flex-col w-full bg-pink-200 outline-none focus:outline-none text-black">
              {/* header */}
              <div className="text-center p-5 rounded-t pb-0">
                <h3 className="text-3xl">Markup</h3>
              </div>
              {/* body */}
              <div className="relative p-6 flex-auto pt-0">
                <p className="my-4 text-sm md:text-lg leading-relaxed">
                  {markup.original_text}
                </p>
              </div>
              {/* footer */}
              <div className="flex items-center justify-end p-6 rounded-b pt-0">
                <button
                  className="background-transparent font-bold uppercase py-0 px-2 text-sm mr-1 mb-1 hover:bg-pink-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
      </>
    </>
  );
}
