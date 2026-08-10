import {Button, Input, Label} from '@plunk/ui';
import {Plus, Trash2} from 'lucide-react';
import {useState} from 'react';

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  initialData?: Record<string, string | number | boolean> | null;
  onChange?: (data: Record<string, string | number | boolean> | null) => void;
}

export function KeyValueEditor({initialData, onChange}: KeyValueEditorProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
    // Initialize state from initialData only once on mount
    if (initialData && typeof initialData === 'object') {
      return Object.entries(initialData).map(([key, value], index) => ({
        id: `initial-${index}-${Date.now()}`,
        key,
        value: String(value),
      }));
    }
    return [];
  });

  // Notify parent of changes based on given pairs
  const notifyChange = (updatedPairs: KeyValuePair[]) => {
    if (!onChange) return;

    // Filter out empty pairs
    const validPairs = updatedPairs.filter(pair => pair.key.trim() !== '');

    if (validPairs.length === 0) {
      onChange(null);
    } else {
      const data = validPairs.reduce(
        (acc, pair) => {
          // Try to parse as number or boolean, otherwise keep as string
          let value: string | number | boolean = pair.value;
          if (pair.value === 'true') value = true;
          else if (pair.value === 'false') value = false;
          else if (!isNaN(Number(pair.value)) && pair.value.trim() !== '') value = Number(pair.value);

          acc[pair.key] = value;
          return acc;
        },
        {} as Record<string, string | number | boolean>,
      );
      onChange(data);
    }
  };

  const addPair = () => {
    const newPairs = [...pairs, {id: `new-${Date.now()}`, key: '', value: ''}];
    setPairs(newPairs);
    notifyChange(newPairs);
  };

  const updateKey = (id: string, newKey: string) => {
    const updated = pairs.map(pair => (pair.id === id ? {...pair, key: newKey} : pair));
    setPairs(updated);
    notifyChange(updated);
  };

  const updateValue = (id: string, newValue: string) => {
    const updated = pairs.map(pair => (pair.id === id ? {...pair, value: newValue} : pair));
    setPairs(updated);
    notifyChange(updated);
  };

  const removePair = (id: string) => {
    const updated = pairs.filter(pair => pair.id !== id);
    setPairs(updated);
    notifyChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Custom data</Label>
        <Button type="button" variant="outline" size="sm" onClick={addPair}>
          <Plus className="h-3 w-3" />
          Add field
        </Button>
      </div>

      {pairs.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-neutral-200 rounded-lg bg-neutral-50">
          <p className="text-sm text-neutral-500">No custom fields yet</p>
          <p className="text-xs text-neutral-400 mt-1">Click &quot;Add Field&quot; to create custom data fields</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map(pair => (
            <div key={pair.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., plan"
                  value={pair.key}
                  onChange={e => updateKey(pair.id, e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="e.g., pro"
                  value={pair.value}
                  onChange={e => updateValue(pair.id, e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button type="button" variant="destructiveGhost" size="icon" onClick={() => removePair(pair.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
