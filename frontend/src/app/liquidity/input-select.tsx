import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { tokenList } from "@/lib/constants";
import { Token } from "@/types/token";

type InputSelectProps = {
  amount: number;
  onAmountChange: (amount: number) => void;
  selectedToken: Token;
  onSelectChange: (token: Token) => void;
};

export function InputSelect({ amount, onAmountChange, selectedToken, onSelectChange }: InputSelectProps) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1 ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Input
        defaultValue={amount}
        className="border-0 p-0 shadow-none focus-visible:ring-0"
        type="number"
        placeholder="0.00"
        min={0}
        value={amount}
        onChange={(e) => onAmountChange(Number(e.target.value))}
      />
      <NativeSelect
        defaultValue={selectedToken.symbol}
        className="w-fit [&_select]:border-0 [&_select]:bg-transparent [&_select]:py-0 [&_select]:pr-8 [&_select]:pl-2 [&_select]:text-sm [&_select]:font-medium [&_select]:focus-visible:ring-0"
        onChange={(e) => onSelectChange(tokenList.find((token) => token.symbol === e.target.value) as Token)}
      >
        {tokenList.map((token) => (
          <NativeSelectOption key={token.symbol} value={token.symbol}>
            {token.symbol}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
