import type { Message } from "../types/message"

interface MessageItemProps {
    message: Message;
}


export default function UserMessageItem({ message }: MessageItemProps) {
    return (
        <div className="flex justify-end px-2">
            <div
                className="inline-block w-auto text-pretty max-w-[85vw] md:max-w-xl lg:max-w-2xl bg-primary text-white shadow-sm text-adaptive leading-relaxed text-left break-words rounded-2xl px-4 py-3">
                {message.text}
            </div>
        </div>
    );
}