// Inline keyboard markup type — inline to avoid import issues
export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Build an inline keyboard markup from a 2D array of [text, callback_data] pairs.
 */
export function ik(buttons: Array<Array<[string, string]>>): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons.map(row =>
      row.map(([text, callback_data]) => ({ text, callback_data }))
    ),
  };
}