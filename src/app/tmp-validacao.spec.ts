// TEMPORÁRIO: valida que teste quebrado reprova o pipeline (PR será fechado)
import { describe, it, expect } from 'vitest';

describe('validação do pipeline', () => {
  it('falha de propósito', () => {
    expect(1).toBe(2);
  });
});
