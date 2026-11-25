import { useState, useMemo } from 'react';
import type { Id } from '../types';
import { useVision } from '../state/VisionContext';
import { useAssignments, useCameras, useEmployees } from '../hooks/useVision';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { Badge, Button, Card, ConfirmButton, EmptyState, TextInput } from '../components/ui/primitives';
import { shortTrackId } from '../utils/format';
import { Users, Plus, UserCheck, Edit3 } from '../components/icons';
import type { PageId } from '../components/navigation/Sidebar';

export function EmployeesPage({ navigate: _navigate }: { navigate?: (page: PageId) => void }): JSX.Element {
  const { controller } = useVision();
  const employees = useEmployees();
  const cameras = useCameras();
  const assignments = useAssignments();

  const [editingId, setEditingId] = useState<Id | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cameraLabel = (cameraId: string): string =>
    cameras.find((c) => c.id === cameraId)?.label ?? 'Unknown Camera';
  const employeeName = (employeeId: string): string =>
    employees.find((e) => e.id === employeeId)?.name ?? shortTrackId(employeeId);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-saas-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-saas-primary">Employee Directory</h1>
          <p className="text-xs text-saas-secondary mt-0.5">
            Maintain employee records and inspect live manual track assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isAdding && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsAdding(true)}
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Add Employee Modal/Card */}
      {isAdding && (
        <Card
          title="Register New Employee"
          subtitle="Add manual staff records for track assignments"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          }
        >
          <EmployeeForm
            submitLabel="Register Employee"
            onCancel={() => setIsAdding(false)}
            onSubmit={(draft) => {
              controller.addEmployee(draft);
              setIsAdding(false);
            }}
          />
        </Card>
      )}

      {/* Active Live Assignments Overview */}
      {assignments.length > 0 && (
        <Card
          title={`Active Track Assignments (${assignments.length})`}
          subtitle="Temporary track bindings manually confirmed by operators"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.trackId}
                className="flex items-center justify-between rounded-lg border border-saas-border bg-saas-bg/50 p-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-saas-success-light text-saas-success">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-saas-primary">
                      {employeeName(assignment.employeeId)}
                    </span>
                    <p className="text-[11px] text-saas-secondary">
                      {cameraLabel(assignment.cameraId)} · #{shortTrackId(assignment.trackId)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => controller.unassignTrack(assignment.trackId)}
                >
                  Unbind
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Employee Data Table */}
      <Card
        title={`All Registered Employees (${employees.length})`}
        subtitle="Employee database stored in local repository abstraction"
        actions={
          <div className="w-64">
            <TextInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or role…"
            />
          </div>
        }
        noPadding
      >
        {filteredEmployees.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users size={28} />}
              title={searchQuery ? 'No matching employees' : 'No employees registered'}
              hint="Add staff members to enable manual assignment during live detection."
              action={
                !isAdding && (
                  <Button variant="primary" size="sm" onClick={() => setIsAdding(true)}>
                    Add Employee
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-saas-border bg-saas-bg/75 text-[11px] font-semibold uppercase tracking-wider text-saas-secondary">
                <tr>
                  <th className="px-5 py-3">Employee Name</th>
                  <th className="px-5 py-3">Role / Department</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Internal Notes</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saas-border bg-white font-medium text-saas-primary">
                {filteredEmployees.map((employee) =>
                  editingId === employee.id ? (
                    <tr key={employee.id} className="bg-saas-bg/40">
                      <td colSpan={5} className="p-4">
                        <EmployeeForm
                          initial={employee}
                          submitLabel="Save Changes"
                          onCancel={() => setEditingId(null)}
                          onSubmit={(draft) => {
                            controller.saveEmployee({ ...employee, ...draft });
                            setEditingId(null);
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={employee.id} className="hover:bg-saas-bg/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-saas-primary">
                        {employee.name}
                      </td>
                      <td className="px-5 py-3.5 text-saas-secondary">
                        {employee.role || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {employee.active ? (
                          <Badge tone="green" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="zinc">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-saas-secondary max-w-xs truncate">
                        {employee.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit3 size={13} />}
                          onClick={() => setEditingId(employee.id)}
                        >
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Delete?"
                          size="sm"
                          onConfirm={() => {
                            controller.deleteEmployee(employee.id);
                            setEditingId((id) => (id === employee.id ? null : id));
                          }}
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
